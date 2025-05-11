from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ValidationError
from rest_framework.renderers import JSONRenderer
from rest_framework.permissions import AllowAny
from rest_framework import status
from .models import User
from .models import Ft42Profile
from .utils import generate_state
from .utils import revoke_token
from .utils import is_token_revoked
import jwt
import datetime
import requests
import pyotp
import qrcode
import uuid
import time
import json
import base64
from io import BytesIO
from qrcode.constants import ERROR_CORRECT_L
from urllib.parse import urlencode
from redis import Redis
from django.core.mail import send_mail

def getStatus(user_id, channel="auth_social"):
    """
    Evaluate if a user is already logged in.
    """

    REDIS_PASSOWRD = settings.REDIS_PASSWORD

    redis = Redis.from_url(f"redis://:{REDIS_PASSOWRD}@redis:6379", decode_responses=True)

    test = 10
    data = {
        'user_id': user_id
    }
    status = None
    print(data)  # debug
    
    redis.publish(channel, json.dumps(data))
    
    while status is None and test >= 0:
        try:
            status = redis.get(f'is_{user_id}_logged')
            print(f'GET status = {status}')  # debug
            if status is not None:
                return status
        except Exception as e:
            print(f"Error occurred: {str(e)}")
            return None
        
        time.sleep(0.1)
        test -= 1
    
    return None

class PublicKeyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        public_key ="""-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtmzE1Io/MYqJRY/dUFRO
2OOYFQtSTZqYbVX+59sqY5755l9b0K44F367XMSr1SbtQUrwd/P0y9iNS9VaszAU
/fGrNy1cr2ukVXx8zvSAfBtAwiVV+c6ujX6BcPdcGBDn57T++JXpChZEITrXgITq
pRZSKfKWGn8ouz3zjnZ/V0Eyiaj4rhfknNOVprNu6wyl4lJlHlYSCLRCjLp7Gh01
w6pZ/QdhmapLnDNuVkLT/5RtJ4yjoC9uPD9ikNQs1VFOYxoIYDxxva0oHpYkfptb
G1D0ynWSdZt4xHnPVeQkB/gdYTFvDU+wslOxXS8bKKQJcQWBRPRXcPFYtBtTaAA/
gwIDAQAB
-----END PUBLIC KEY-----"""

        return JsonResponse({'public_key': public_key.strip()}, status=status.HTTP_200_OK)
    
class VerifyTokenView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            raise AuthenticationFailed('Missing or invalid Authorization header!')
        
        access_token = auth_header.split(' ')[1]

        if (access_token is None):
           raise AuthenticationFailed('Missing token!')

        try:
            jwt.decode(access_token, settings.FRONTEND_JWT["PUBLIC_KEY"], algorithms=[settings.FRONTEND_JWT["ALGORITHM"]])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Refresh token expired!')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid refresh token!')

        return Response({'success': 'true'}, status=status.HTTP_200_OK)
class LoginView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        code = request.data.get('totp')

        user = User.objects.filter(email=email).first()

        if user is None:
            raise AuthenticationFailed('User not found!')

        user_status = getStatus(user.id)

        if user_status != "offline":
            raise ValidationError({"error": "User already logged in"})
        
        if not user.check_password(password):
            raise AuthenticationFailed('Incorrect password!')
            
        if user.is_2fa_enabled:
            if not code:
                raise ValidationError({"error": "2fa_required!"})

            totp = pyotp.TOTP(user.totp_secret)
            if not totp.verify(code):
                raise ValidationError({"error": "invalid_totp"})

        access_payload = {
            'id': user.id,
            'uuid': str(user.uuid),
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=120),
            'iat': datetime.datetime.now(datetime.timezone.utc),
            'jti': str(uuid.uuid4()),
            'typ': "user",
            'oauth': False,
            'avatar': user.avatar.url if user.avatar else None
        }

        refresh_payload = {
            'id': user.id,
            'uuid': str(user.uuid), 
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
            'iat': datetime.datetime.now(datetime.timezone.utc),
            'jti': str(uuid.uuid4()),
            'typ': "user",
            'oauth': False,
            'avatar': user.avatar.url if user.avatar else None
        }

        witness_payload = {
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        }

        witness_token = jwt.encode(witness_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])
        access_token = jwt.encode(access_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])
        refresh_token = jwt.encode(refresh_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])

        response = Response()

        response.set_cookie(
            key='refreshToken',
            value=refresh_token,
            expires=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
            httponly=True,
            samesite='Lax',
            secure=True,
            path='/'
        )

        response.set_cookie(
            key='witnessToken',
            value=witness_token, 
            expires=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        )

        response.data = {
            'success': 'true',
            'accessToken': access_token
        }
        return response
    
class RefreshTokenView(APIView):
    renderer_classes = [JSONRenderer]

    def head(self, request):
        if "refreshToken" in request.COOKIES:
            return JsonResponse({'success': True}, status=status.HTTP_200_OK)
        else:
            return JsonResponse({'success': False}, status=status.HTTP_204_NO_CONTENT)

    def post(self, request):
        old_refresh_token = request.COOKIES.get('refreshToken')

        if is_token_revoked(old_refresh_token):
            raise AuthenticationFailed('Token has been revoked')

        if not old_refresh_token:
            raise AuthenticationFailed('Refresh token missing!')
        try:
            old_data = jwt.decode(old_refresh_token, settings.FRONTEND_JWT["PUBLIC_KEY"], algorithms=[settings.FRONTEND_JWT["ALGORITHM"]])
            # Get the user by ID
            user = User.objects.filter(id=old_data.get("id")).first()
            if not user:
                raise AuthenticationFailed('User not found!')
            
            # Verify the UUID matches
            token_uuid = old_data.get("uuid")
            if not token_uuid or str(user.uuid) != token_uuid:
                raise AuthenticationFailed('Invalid token UUID!')

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Refresh token expired!')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid refresh token!')
        
        revoked = revoke_token(old_refresh_token)
        if revoked:
            print('Token revoked successfuly.')
        else:
            print('Error while revoking the token.')

        isOauth = old_data.get('oauth')
        access_payload = {
            'id': user.id,
            'uuid': str(user.uuid), 
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=120),
            'iat': datetime.datetime.now(datetime.timezone.utc),
            'jti': str(uuid.uuid4()),
            'typ': "user",
            'oauth': True if isOauth else False,
            'avatar': user.avatar.url if user.avatar else None
        }

        refresh_payload = {
            'id': user.id,
            'uuid': str(user.uuid),
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
            'iat': datetime.datetime.now(datetime.timezone.utc),
            'jti': str(uuid.uuid4()),
            'typ': "user",
            'oauth': True if isOauth else False,
            'avatar': user.avatar.url if user.avatar else None
        }

        witness_payload = {
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        }

        witness_token = jwt.encode(witness_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])
        new_access_token = jwt.encode(access_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])
        new_refresh_token = jwt.encode(refresh_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])

        response = Response()
        response.set_cookie(
            key='refreshToken',
            value=new_refresh_token,
            expires=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
            httponly=True,
            samesite='Lax',
            secure=True,
            path='/'
        )

        response.set_cookie(
            key='witnessToken',
            value=witness_token, 
            expires=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        )

        response.data = {
            'success': 'true',
            'accessToken': new_access_token
        }
        return response
    
class LogoutView(APIView):
    renderer_classes = [JSONRenderer]


    def post(self, request):
        refresh_token = request.COOKIES.get('refreshToken')
        if refresh_token:
            revoked = revoke_token(refresh_token)
            if revoked:
                response = Response(status=status.HTTP_205_RESET_CONTENT)
                response.delete_cookie('refreshToken')
                response.data = {
                    'success': 'true'
                }
                return response
        return Response(status=status.HTTP_400_BAD_REQUEST)


class Enroll2FAView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        user = request.user
        
        if user.is_2fa_enabled:
            return Response({'message': '2FA is already enabled.'}, status=status.HTTP_400_BAD_REQUEST)
        
        totp_secret = pyotp.random_base32()
        user.totp_secret = totp_secret
        user.save()

        totp = pyotp.TOTP(totp_secret)
        provisioning_uri = totp.provisioning_uri(user.email, issuer_name="ft_tr")

        qr = qrcode.QRCode(
            version=1,
            error_correction=ERROR_CORRECT_L,
            box_size=10,
            border=1,
        )
        
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        response_data = {
            'success': 'true',
            'provisioning_uri': provisioning_uri,
            'qr_code': qr_code_base64,
        }

        return Response(response_data, status=status.HTTP_200_OK)
    
class Verify2FAView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        user = request.user

        if not user.totp_secret:
            return Response({"error": "2FA is not setup for this user."}, status=400)
        
        code = request.data.get('totp')
        totp = pyotp.TOTP(user.totp_secret)
        
        if totp.verify(code):
            user.is_2fa_enabled = True
            user.save()
            return Response({"success": "true", "message": "2FA has been enabled."}, status=200)
        else:
            return Response({"error": "Invalid or expired 2FA code"}, status=401)   
        
               
class Disable2FAView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        user = request.user

        code = request.data.get('totp')
        password = request.data.get('password')
        
        # Verify password
        if not user.check_password(password):
            return Response({"error": "Invalid password"}, status=401)
            
        # Verify TOTP code
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code):
            return Response({"error": "Invalid 2FA code"}, status=401)
        
        user.is_2fa_enabled = False
        user.totp_secret = None
        user.save()

        return Response({'message': '2FA has been disabled and secret key removed.'}, status=status.HTTP_200_OK)
    
class Get2FAStatusView(APIView):
    renderer_classes = [JSONRenderer]
    
    def get(self, request):
        user = request.user
        return Response({
            'is_2fa_enabled': user.is_2fa_enabled
        }, status=status.HTTP_200_OK)
    
    
class OAuthLoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):        
        state = generate_state()
        request.session['oauth_state'] = state
        params = {
            'client_id': settings.OAUTH2_ACF_CLIENT_ID,
            'redirect_uri': settings.OAUTH2_ACF_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'public',
            'state': state,
        }
        url = f'https://api.intra.42.fr/oauth/authorize?{urlencode(params)}'
        return redirect(url)
    
    
class OAuthCallbackView(APIView):
    renderer_classes = [JSONRenderer]

    def get(self, request):
        code = request.GET.get('code')
        if not code:
            return Response({"error": "Missing code"}, status=status.HTTP_400_BAD_REQUEST)

        token_data = {
            'grant_type': 'authorization_code',
            'client_id': settings.OAUTH2_ACF_CLIENT_ID,
            'client_secret': settings.OAUTH2_ACF_CLIENT_SECRET,
            'code': code,
            'redirect_uri': settings.OAUTH2_ACF_REDIRECT_URI,
        }
        token_url = 'https://api.intra.42.fr/oauth/token'
        token_response = requests.post(token_url, data=token_data, timeout=10)

        if token_response.status_code != 200:
            return Response({"error": "Failed token exchange"}, status=status.HTTP_400_BAD_REQUEST)

        token_info = token_response.json()
        access_token = token_info['access_token']
        refresh_token = token_info['refresh_token']

        me_url = 'https://api.intra.42.fr/v2/me'
        headers = {"Authorization": f"Bearer {access_token}"}
        profile_resp = requests.get(me_url, headers=headers, timeout=10)
        if profile_resp.status_code != 200:
            return Response({"error": "Could not fetch 42 user info"}, status=status.HTTP_400_BAD_REQUEST)
        
        profile_data = profile_resp.json()
        ft_id = profile_data["id"]
        ft_email = profile_data.get("email", "")
        ft_login = profile_data.get("login", "")

        try:
            ft_profile = Ft42Profile.objects.get(ft_id=ft_id)
            user = ft_profile.user
        except Ft42Profile.DoesNotExist:
            # Check if username already exists
            if User.objects.filter(username=ft_login).exists():
                return Response(
                    {"error": "A user with this username already exists."},
                    status=status.HTTP_409_CONFLICT
                )
                
            user = User.objects.create_user(
                username=ft_login,
                email=ft_email,
                password=None
            )

            ft_profile = Ft42Profile.objects.create(
                user=user,
                ft_id=ft_id
            )

        # Check if user is allowed to log in
        user_status = getStatus(user.id)
        if user_status != "offline":
            return Response(
                {"error": "User already logged in"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        ft_profile.access_token = access_token
        ft_profile.refresh_token = refresh_token
        ft_profile.login = ft_login
        ft_profile.email = ft_email
        ft_profile.save()

        refresh_payload = {
            'id': user.id,
            'uuid': str(user.uuid),
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
            'iat': datetime.datetime.now(datetime.timezone.utc),
            'jti': str(uuid.uuid4()),
            'typ': "user",
            'oauth': True,
            'avatar': user.avatar.url if user.avatar else None
        }

        witness_payload = {
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        }

        refresh_token = jwt.encode(refresh_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])
        witness_token = jwt.encode(witness_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])

        html_content = f"""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                </head>
                <body>
                    <script>
                        window.location.href = "/#profile";
                    </script>
                    <p>Redirecting to profile...</p>
                </body>
                </html>
        """

        response = HttpResponse(html_content, content_type="text/html")

        response.set_cookie(
            key='refreshToken',
            value=refresh_token,
            expires=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
            httponly=True,
            samesite='Lax',
            secure=True,
            path='/'
        )

        response.set_cookie(
            key='witnessToken',
            value=witness_token, 
            expires=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        )

        return response  
