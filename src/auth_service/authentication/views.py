from .models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.renderers import JSONRenderer
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from django.http import JsonResponse
from urllib.parse import urlencode
import jwt
import datetime
import requests
import pyotp
import qrcode
from io import BytesIO
import base64
import secrets
from .utils import generate_state

class LoginView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        totp = request.data.get('totp')

        user = User.objects.filter(email=email).first()

        if user is None:
            raise AuthenticationFailed('User not found!')
        
        if not user.check_password(password):
            raise AuthenticationFailed('Incorrect password!')
            
        if user.is_2fa_enabled:
            if not totp:
                return Response({"success": False, "error": "2fa_required!"}, status=400)

            totp = pyotp.TOTP(user.totp_secret)
            if not totp.verify(totp):
                return Response({"success": False, "error": "invalid_totp"}, status=400)

        access_payload = {
            'id': user.id,
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5),
            'iat': datetime.datetime.now(datetime.timezone.utc),
        }

        refresh_payload = {
            'id': user.id,
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
            'iat': datetime.datetime.now(datetime.timezone.utc),
        }

        access_token = jwt.encode(access_payload, settings.JWT_PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)
        refresh_token = jwt.encode(refresh_payload, settings.JWT_PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)

        response = Response()
        response.set_cookie(
            key='refreshToken',
            value=refresh_token, 
            httponly=True,
            samesite='None',
            secure=True,
            path='/'
        )
        response.data = {
            'success': 'true',
            'accessToken': access_token
        }
        return response 
class RefreshTokenView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        refresh_token = request.COOKIES.get('refreshToken')
        email = request.data.get('email')

        user = User.objects.filter(email=email).first()

        if not refresh_token:
            raise AuthenticationFailed('Refresh token missing!')
        if not user:
            raise AuthenticationFailed('User not found!')

        try:
            jwt.decode(refresh_token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Refresh token expired!')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid refresh token!')

        access_payload = {
            'id': user.id,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5),
            'iat': datetime.datetime.now(datetime.timezone.utc),
        }
        new_access_token = jwt.encode(access_payload, settings.JWT_PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)

        return Response({
            'success': True,
            'accessToken': new_access_token
        })
class LogoutView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        response = Response()
        response.delete_cookie('refreshToken')
        response.data = {
            'message': 'success'
        }
        return response

class Enroll2FAView(APIView):
    """
    Setup 2fa for the user.
    """
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        user = request.user
        
        if user.is_2fa_enabled:
            return Response({'message': '2FA is already enabled.'}, status=status.HTTP_400_BAD_REQUEST)
        
        totp_secret = pyotp.random_base32()
        user.totp_secret = totp_secret
        # user.is_2fa_enabled = True
        user.save()

        totp = pyotp.TOTP(totp_secret)
        provisioning_uri = totp.provisioning_uri(user.email, issuer_name="MyPongApp")

        qr = qrcode.make(provisioning_uri)
        buffer = BytesIO()
        qr.save(buffer, format='PNG')
        buffer.seek(0)

        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        response_data = {
            'success': 'true',
            'provisioning_uri': provisioning_uri,
            'qr_code': qr_code_base64,
        }

        return Response(response_data, status=status.HTTP_200_OK)
    
class Verify2FAView(APIView):
    permission_classes = [IsAuthenticated]
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
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        user = request.user
        user.is_2fa_enabled = False 
        user.save()
        return Response({'message': '2FA has been disabled.'}, status=status.HTTP_200_OK)
    
class OAuthRedirectView(APIView):
    renderer_classes = [JSONRenderer]

    def get(self, request):
        state = generate_state()
        request.session['oauth_state'] = state
        params = {
            'client_id': settings.OAUTH_CLIENT_ID,
            'redirect_uri': settings.OAUTH_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'public',
            'state': state,
        }
        url = f'https://api.intra.42.fr/oauth/authorize?{urlencode(params)}'
        return Response({"url": url}, status=status.HTTP_302_FOUND)

class OAuthCallbackView(APIView):
    renderer_classes = [JSONRenderer]

    def get(self, request):
        code = request.GET.get('code')
        received_state = request.GET.get('state')
        stored_state = request.session.get('oauth_state')

        # if received_state != stored_state:
        #     return Response({"error": "Invalid state, possible CSRF attack"},
        #                     status=status.HTTP_400_BAD_REQUEST)

        token_data = {
            'grant_type': 'authorization_code',
            'client_id': settings.OAUTH_CLIENT_ID,
            'client_secret': settings.OAUTH_CLIENT_SECRET,
            'code': code,
            'redirect_uri': settings.OAUTH_REDIRECT_URI,
        }

        url = 'https://api.intra.42.fr/oauth/token'
        response = requests.post(url, data=token_data)

        if response.status_code == 200:
            token_info = response.json()
            access_token = token_info['access_token']
            refresh_token = token_info['refresh_token']

            response = Response()
            response.set_cookie(
                key='refreshToken',
                value=refresh_token, 
                httponly=True, 
                secure=False,
                path='/'
            )
            response.data = {
                'success': 'true',
                'accessToken': access_token
            }
            return response 
        else:
            return Response({"error": "Failed to obtain access token"}, status=status.HTTP_400_BAD_REQUEST)
