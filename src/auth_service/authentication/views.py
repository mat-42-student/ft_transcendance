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
from qrcode.constants import ERROR_CORRECT_L
from io import BytesIO
import base64
import secrets
from .utils import generate_state
from .utils import revoke_token
from .utils import is_token_revoked

class PublicKeyView(APIView):
    """
    Return a public key to the client, and let him choose if he want it as oneline or not.
    i.e. GET /public-key/?form=oneline
    """
    def get(self, request):
        public_key = """
        -----BEGIN PUBLIC KEY-----
        MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnvGKZgRN72lJMBIMq8MtxHTjK
        zJV/3WpHj52TiVYhD43Z+Z720BH257gqBni5Vpsph96EhBHmiDqDuJKr1x5KWz1tDG2A8
        RQszEPfpryTRXZKnv33wMfLo+h9qo6yXvh8BT9It/zk5mNoqugTmH+oBo7qr8emuBFXXo
        HIPF+AhcCpFoSETuTBe3ufAlT8v2LjKdw/NDzxm3KBd7s/3nA/+euQ97gWB1ZlwHFC9gb
        0e5zCW6Clh7YCPEQ1OJ/YmzUsowVObQYqrPh0SLuv1qmUqLdFdEYr1wO0jYPiZeDP6Hf8
        oH2s6dVoczMWvQvqr10xc9TPCefefPNE2lqpH2IrQIDAQAB
        -----END PUBLIC KEY-----
        """

        if request.GET.get("form") == "oneline":
            public_key = public_key.replace("\n", "").replace(" ", "")

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
            jwt.decode(access_token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
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
        
        if not user.check_password(password):
            raise AuthenticationFailed('Incorrect password!')
            
        if user.is_2fa_enabled:
            if not code:
                return Response({"success": False, "error": "2fa_required!"}, status=400)


            totp = pyotp.TOTP(user.totp_secret)
            if not totp.verify(code):
                return Response({"success": False, "error": "invalid_totp"}, status=400)

        access_payload = {
            'id': user.id,
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=60),
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
        old_refresh_token = request.COOKIES.get('refreshToken')

        if is_token_revoked(old_refresh_token):
            raise AuthenticationFailed('Token has been revoked')

        if not old_refresh_token:
            raise AuthenticationFailed('Refresh token missing!')
        try:
            old_data = jwt.decode(old_refresh_token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
            user = User.objects.filter(id=old_data.get("id")).first()
            if not user:
                raise AuthenticationFailed('User not found!')

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Refresh token expired!')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid refresh token!')
        
        revoke_token(old_refresh_token)  

        access_payload = {
            'id': user.id,
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=60),
            'iat': datetime.datetime.now(datetime.timezone.utc),
        }

        refresh_payload = {
            'id': user.id,
            'username': user.username,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
            'iat': datetime.datetime.now(datetime.timezone.utc),
        }

        new_access_token = jwt.encode(access_payload, settings.JWT_PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)
        new_refresh_token = jwt.encode(refresh_payload, settings.JWT_PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)

        response = Response()
        response.set_cookie(
            key='refreshToken',
            value=new_refresh_token,
            httponly=True,
            samesite='None',
            secure=True,
            path='/'
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

        response = Response()
class Enroll2FAView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        user = request.user
        
        # if user.is_2fa_enabled:
        #     return Response({'message': '2FA is already enabled.'}, status=status.HTTP_400_BAD_REQUEST)
        
        totp_secret = pyotp.random_base32()
        user.totp_secret = totp_secret
        # user.is_2fa_enabled = True
        user.save()

        totp = pyotp.TOTP(totp_secret)
        provisioning_uri = totp.provisioning_uri(user.email, issuer_name="MyPongApp")

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
