import jwt
import datetime
import requests
import pyotp
import qrcode
import uuid
import logging
from io import BytesIO
import base64
from qrcode.constants import ERROR_CORRECT_L
from urllib.parse import urlencode
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ValidationError
from rest_framework.renderers import JSONRenderer
from rest_framework.permissions import AllowAny
from rest_framework import status
from oauth2_provider.contrib.rest_framework import OAuth2Authentication
from oauth2_provider.contrib.rest_framework import TokenHasScope
from .models import User
from .models import Ft42Profile
from .utils import generate_state
from .utils import revoke_token
from .utils import is_token_revoked
from .utils import getStatus
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.http import HttpResponse
from django.core.cache import cache
from auth.utils.vault_client import VaultClient  # Update import path to match your project structure


class VerifyTokenView(APIView):
    renderer_classes = [JSONRenderer]
    
    def post(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise AuthenticationFailed('Missing or invalid Authorization header!')
        
        access_token = auth_header.split(' ')[1]
        if not access_token:
            raise AuthenticationFailed('Missing token!')
        
        try:
            # Get the Vault client - shared instance from settings
            # This avoids creating a new client for each request
            if hasattr(settings, 'vault_client') and settings.vault_client:
                vault_client = settings.vault_client
            else:
                # Fallback to creating a new client if needed
                vault_client = VaultClient()
            
            # Get JWT configuration for access tokens
            access_config = vault_client.get_jwt_config('jwt-config/frontend-access')
            
            # Verify token using Vault
            payload = vault_client.verify_jwt(access_config['key_name'], access_token)
            
            if not payload:
                raise AuthenticationFailed('Invalid token!')
            
            # Check if token is expired
            import time
            current_time = int(time.time())
            if payload.get('exp', 0) < current_time:
                raise AuthenticationFailed('Token expired!')
            
            # Check token type
            if payload.get('typ') != 'access':
                raise AuthenticationFailed('Invalid token type!')
            
            return Response({'success': 'true'}, status=status.HTTP_200_OK)
        except Exception as e:
            logging.error(f"Token verification error: {str(e)}")
            raise AuthenticationFailed(f'Token verification failed: {str(e)}')


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

        try:
            # Get the Vault client - shared instance from settings
            if hasattr(settings, 'vault_client') and settings.vault_client:
                vault_client = settings.vault_client
            else:
                # Fallback to creating a new client if needed
                vault_client = VaultClient()
            
            # Get JWT configurations from Vault
            access_config = vault_client.get_jwt_config('jwt-config/frontend-access')
            refresh_config = vault_client.get_jwt_config('jwt-config/frontend-refresh')
            
            # Calculate expiration times based on configured TTL
            access_ttl_minutes = int(access_config['ttl'].replace('m', ''))
            refresh_ttl_days = int(refresh_config['ttl'].replace('d', ''))
            
            # Create access token payload
            access_payload = {
                'id': user.id,
                'username': user.username,
                'exp': int((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=access_ttl_minutes)).timestamp()),
                'iat': int(datetime.datetime.now(datetime.timezone.utc).timestamp()),
                'jti': str(uuid.uuid4()),
                'typ': "access",
                'iss': access_config['issuer'],
                'aud': access_config['audience']
            }

            # Create refresh token payload
            refresh_payload = {
                'id': user.id,
                'username': user.username,
                'exp': int((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=refresh_ttl_days)).timestamp()),
                'iat': int(datetime.datetime.now(datetime.timezone.utc).timestamp()),
                'jti': str(uuid.uuid4()),
                'typ': "refresh",
                'iss': refresh_config['issuer'],
                'aud': refresh_config['audience']
            }

            # Sign JWTs using Vault
            access_token = vault_client.sign_jwt(access_config['key_name'], access_payload)
            refresh_token = vault_client.sign_jwt(refresh_config['key_name'], refresh_payload)

            response = Response()
            response.set_cookie(
                key='refreshToken',
                value=refresh_token, 
                httponly=True,
                samesite='Lax',
                secure=True,
                path='/'
            )
            response.data = {
                'success': 'true',
                'accessToken': access_token
            }
            return response
            
        except Exception as e:
            logging.error(f"Login error: {str(e)}")
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')


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
            # Get the Vault client - shared instance from settings
            if hasattr(settings, 'vault_client') and settings.vault_client:
                vault_client = settings.vault_client
            else:
                # Fallback to creating a new client if needed
                vault_client = VaultClient()
            
            # Get JWT configuration from Vault
            refresh_config = vault_client.get_jwt_config('jwt-config/frontend-refresh')
            
            # Verify refresh token using Vault
            payload = vault_client.verify_jwt(refresh_config['key_name'], old_refresh_token)
            
            if not payload:
                raise AuthenticationFailed('Invalid refresh token!')
                
            # Check if token is expired
            current_time = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
            if payload.get('exp', 0) < current_time:
                raise AuthenticationFailed('Refresh token expired!')
                
            # Check token type
            if payload.get('typ') != 'refresh':
                raise AuthenticationFailed('Invalid token type!')
                
            # Get user from payload
            user = User.objects.filter(id=payload.get('id')).first()
            if not user:
                raise AuthenticationFailed('User not found!')
                
            # Revoke old token
            revoked = revoke_token(old_refresh_token)
            if revoked:
                logging.info('Token revoked successfully.')
            else:
                logging.warning('Error while revoking the token.')
                
            # Get access token configuration
            access_config = vault_client.get_jwt_config('jwt-config/frontend-access')
            
            # Calculate expiration times based on configured TTL
            access_ttl_minutes = int(access_config['ttl'].replace('m', ''))
            refresh_ttl_days = int(refresh_config['ttl'].replace('d', ''))
            
            # Create new access token payload
            access_payload = {
                'id': user.id,
                'username': user.username,
                'exp': int((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=access_ttl_minutes)).timestamp()),
                'iat': int(datetime.datetime.now(datetime.timezone.utc).timestamp()),
                'jti': str(uuid.uuid4()),
                'typ': "access",
                'iss': access_config['issuer'],
                'aud': access_config['audience']
            }

            # Create new refresh token payload
            refresh_payload = {
                'id': user.id,
                'username': user.username,
                'exp': int((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=refresh_ttl_days)).timestamp()),
                'iat': int(datetime.datetime.now(datetime.timezone.utc).timestamp()),
                'jti': str(uuid.uuid4()),
                'typ': "refresh",
                'iss': refresh_config['issuer'],
                'aud': refresh_config['audience']
            }

            # Sign new JWTs using Vault
            new_access_token = vault_client.sign_jwt(access_config['key_name'], access_payload)
            new_refresh_token = vault_client.sign_jwt(refresh_config['key_name'], refresh_payload)

            response = Response()
            response.set_cookie(
                key='refreshToken',
                value=new_refresh_token,
                httponly=True,
                samesite='Lax',
                secure=True,
                path='/'
            )
            response.data = {
                'success': 'true',
                'accessToken': new_access_token
            }
            return response
            
        except Exception as e:
            logging.error(f"Token refresh error: {str(e)}")
            raise AuthenticationFailed(f'Token refresh failed: {str(e)}')
    
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
        user.is_2fa_enabled = False 
        user.save()
        return Response({'message': '2FA has been disabled.'}, status=status.HTTP_200_OK)  
        
class OAuthLoginView(APIView):
    permission_classes = [AllowAny]

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
        return redirect(url)
        
class OAuthCallbackView(APIView):
    renderer_classes = [JSONRenderer]

    def get(self, request):
        code = request.GET.get('code')
        if not code:
            return Response({"error": "Missing code"}, status=status.HTTP_400_BAD_REQUEST)

        token_data = {
            'grant_type': 'authorization_code',
            'client_id': settings.OAUTH_CLIENT_ID,
            'client_secret': settings.OAUTH_CLIENT_SECRET,
            'code': code,
            'redirect_uri': settings.OAUTH_REDIRECT_URI,
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

        # user = User.objects.filter(email=ft_email).first()
        # if user != None:
        #     user_status = getStatus(user.id)
        #     if user_status != "offline":
        #         return Response({"success": False, "error": "User already logged in"}, status=400)  

        try:
            ft_profile = Ft42Profile.objects.get(ft_id=ft_id)
            user = ft_profile.user
        except Ft42Profile.DoesNotExist:
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

        try:
            # Get the Vault client - shared instance from settings
            if hasattr(settings, 'vault_client') and settings.vault_client:
                vault_client = settings.vault_client
            else:
                # Fallback to creating a new client if needed
                vault_client = VaultClient()
                
            # Get JWT configurations from Vault
            refresh_config = vault_client.get_jwt_config('jwt-config/frontend-refresh')
            
            # Calculate expiration time based on configured TTL
            refresh_ttl_days = int(refresh_config['ttl'].replace('d', ''))
            
            # Create refresh token payload
            refresh_payload = {
                'id': user.id,
                'username': user.username,
                'exp': int((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=refresh_ttl_days)).timestamp()),
                'iat': int(datetime.datetime.now(datetime.timezone.utc).timestamp()),
                'jti': str(uuid.uuid4()),
                'typ': "refresh",
                'iss': refresh_config['issuer'],
                'aud': refresh_config['audience']
            }

            # Sign JWT using Vault
            refresh_token = vault_client.sign_jwt(refresh_config['key_name'], refresh_payload)
            
        except Exception as e:
            logging.error(f"OAuth JWT creation error: {str(e)}")
            # Fallback to legacy token creation if Vault is unavailable
            refresh_payload = {
                'id': user.id,
                'username': user.username,
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
                'iat': datetime.datetime.now(datetime.timezone.utc),
                'jti': str(uuid.uuid4()),
                'typ': "user"
            }
            refresh_token = jwt.encode(
                refresh_payload, 
                settings.FRONTEND_JWT.get("PRIVATE_KEY", "fallback-secret-key"), 
                algorithm=settings.FRONTEND_JWT.get("ALGORITHM", "HS256")
            )

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
            httponly=True,
            samesite='Lax',
            secure=True,
            path='/'
        )

        return response