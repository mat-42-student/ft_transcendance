from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authentication import BaseAuthentication
from django.contrib.auth import get_user_model
import jwt
from rest_framework.authentication import BaseAuthentication
from requests import post
import os

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        """
        Custom authentication class for JWT-based authentication.
        """
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        access_token = auth_header.split(' ')[1]

        try:
            payload = jwt.decode(access_token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Access token expired!')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid access token!')

        user_id = payload.get('id')
        if not user_id:
            raise AuthenticationFailed('Invalid token payload!')

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise AuthenticationFailed('User not found!')

        return (user, None)

    def authenticate_header(self, request):
        """
        Returns the value for the `WWW-Authenticate` header in a 401 response.
        """
        return 'Bearer'
    
class RemoteOAuth2Authentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        token = auth_header.split(' ')[1]

        response = post(
            'http://auth:8000/api/v1/auth/o/introspect/',
            data={'token': token},
            auth=(os.getenv('OAUTH2_CCF_CLIENT_ID'), os.getenv('OAUTH2_CCF_CLIENT_SECRET')),
        )
        if response.status_code == 200 and response.json().get('active'):
            client_id = response.json().get('client_id')
            return (ClientApplication(client_id), None)
        return None

class ClientApplication:
    """
    A dummy user-like object to represent the client application.
    """
    def __init__(self, client_id):
        self.client_id = client_id
        self.is_authenticated = True
        self.username = 'oauth_client'
