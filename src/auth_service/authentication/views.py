from .models import CustomUser
from .serializers import UserSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
from urllib.parse import urlencode
import jwt
import datetime
import requests

class SignUpView(APIView):
    renderer_classes = [JSONRenderer]
    permission_classes = [AllowAny]

    def post(self, request):
        serialiser = UserSerializer(data=request.data)
        serialiser.is_valid(raise_exception=True)
        serialiser.save()
        return Response(serialiser.data)
    
class LoginView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        otp = request.data.get('otp')

        user = CustomUser.objects.filter(email=email).first()

        if user is None:
            raise AuthenticationFailed('User not found!')
        
        if not user.check_password(password):
            raise AuthenticationFailed('Incorrect password!')
        
        if user.is_2fa_enabled:
            if user.is_otp_expired() or not user.otp:
                user.otp = None
                user.otp_expiry_time = None
                user.generate_otp()

                send_mail(
                    'Verification Code',
                    f'Your verification code is: {user.otp}',
                    'from@example.com',
                    [email],
                    fail_silently=False,
                )
                return Response({'message': 'OTP sent! Please check your email.'}, status=200)
            if otp != user.otp:
                raise AuthenticationFailed('Invalid OTP!')
            user.otp = None
            user.save()

        access_payload = {
            'id': user.id,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=60),
            'iat': datetime.datetime.now(datetime.timezone.utc),
        }

        refresh_payload = {
            'id': user.id,
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
            secure=False,
            path='/'
        )
        response.data = {
            'accessToken': access_token
        }
        return response
    
class RefreshTokenView(APIView):
    def post(self, request):
        refresh_token = request.COOKIES.get('refreshToken')
        email = request.data.get('email')

        user = CustomUser.objects.filter(email=email).first()

        if not refresh_token:
            raise AuthenticationFailed('Refresh token missing!')
        if not user:
            raise AuthenticationFailed('User not found!')

        try:
            payload = jwt.decode(refresh_token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Refresh token expired!')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid refresh token!')

        access_payload = {
            'id': user.id,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=1),
            'iat': datetime.datetime.now(datetime.timezone.utc),
        }
        new_access_token = jwt.encode(access_payload, settings.JWT_PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)

        return Response({'accessToken': new_access_token})


class PingView(APIView):
    renderer_classes = [JSONRenderer]
    # permission_classes = [IsAuthenticated]

    def get(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            raise AuthenticationFailed('Unauthenticated!')
        
        access_token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(access_token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Access token expired!')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid access token!')
        
        user = CustomUser.objects.filter(id=payload['id']).first()
        if not user:
            raise AuthenticationFailed('User not found!')
        
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
class LogoutView(APIView):
    def post(self, request):
        response = Response()
        response.delete_cookie('refreshToken')
        response.data = {
            'message': 'success'
        }
        return response
    
class Enable2FAView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            raise AuthenticationFailed('Unauthenticated!')
        
        access_token = auth_header.split(' ')[1]

        if not access_token:
            raise AuthenticationFailed('Unauthenticated!')
        
        try:
            payload = jwt.decode(access_token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Unauthenticated!')
        
        user = CustomUser.objects.filter(id=payload['id']).first()
        user.is_2fa_enabled = True
        user.save()
        return Response({'message': '2FA has been enabled.'}, status=status.HTTP_200_OK)

class Disable2FAView(APIView):
    renderer_classes = [JSONRenderer]

    def post(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            raise AuthenticationFailed('Unauthenticated!')
        
        access_token = auth_header.split(' ')[1]

        if not access_token:
            raise AuthenticationFailed('Unauthenticated!')
        
        try:
            payload = jwt.decode(access_token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Unauthenticated!')
        
        user = CustomUser.objects.filter(id=payload['id']).first()
        user.is_2fa_enabled = False 
        user.save()
        return Response({'message': '2FA has been disabled.'}, status=status.HTTP_200_OK)

class OAuthRedirectView(APIView):
    renderer_classes = [JSONRenderer]

    def get(self, request):
        client_id = settings.OAUTH_CLIENT_ID
        redirect_uri = 'http://localhost:9090/api/oauth/callback'
        scope = 'public'
        state = 'a_random_string_for_csrf' # Create a function for that

        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': scope,
            'state': state,
        }
        
        auth_url = f'https://api.intra.42.fr/oauth/authorize?{urlencode(params)}'

        return Response({"url": auth_url}, status=status.HTTP_302_FOUND)

class OAuthCallbackView(APIView):
    renderer_classes = [JSONRenderer]

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')

        if state != 'a_random_string_for_csrf': # Create a function for that
            return Response({"error": "Invalid state, possible CSRF attack"}, status=status.HTTP_400_BAD_REQUEST)

        token_data = {
            'grant_type': 'authorization_code',
            'client_id': settings.OAUTH_CLIENT_ID,
            'client_secret': settings.OAUTH_CLIENT_SECRET,
            'code': code,
            'redirect_uri': 'http://localhost:9090/api/oauth/callback',
        }

        token_url = 'https://api.intra.42.fr/oauth/token'
        response = requests.post(token_url, data=token_data)

        if response.status_code == 200:
            token_info = response.json()
            access_token = token_info['access_token']
            refresh_token = token_info.get('refresh_token')

            request.session['access_token'] = access_token
            request.session['refresh_token'] = refresh_token

            return Response({"access_token": access_token, "refresh_token": refresh_token}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to obtain access token"}, status=status.HTTP_400_BAD_REQUEST)

