from django.conf import settings
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication
from django.contrib.auth import get_user_model
import requests
import urllib.parse

User = get_user_model()
    
class OAuth2IntrospectionAuthentication(BaseAuthentication):
    """
    Custom authentication class for OAuth-based authentication.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        url = 'http://auth-service:8000/api/v1/auth/o/introspect/'
        client_id = settings.OAUTH2_CCF_TOKEN_URL
        client_secret = settings.OAUTH2_CCF_CLIENT_SECRET

        if not url or not client_id or not client_secret:
            raise exceptions.AuthenticationFailed('OAuth2 introspection settings not configured properly.')

        try:
            data = {
                'token': token,
                'client_id': client_id,
                'client_secret': client_secret
            }
            encoded_data = urllib.parse.urlencode(data)
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            response = requests.post(url, headers=headers, data=encoded_data)
            token_data = response.json()

        except requests.exceptions.JSONDecodeError:
            raise exceptions.AuthenticationFailed('Introspection endpoint returned an invalid response (not JSON).')

        except requests.RequestException:
            raise exceptions.AuthenticationFailed('Failed to contact introspection endpoint.')

        if response.status_code != 200:
            raise exceptions.AuthenticationFailed('Introspection endpoint returned an error.')

        if not token_data.get('active', False):
            raise exceptions.AuthenticationFailed('Token is not active.')

        username = token_data.get('username')
        if not username:
            dummy_user = User(username='oauth_client', is_active=True)
            return (dummy_user, None)

        user = User.objects.filter(pk=username).first()
        if not user:
            raise exceptions.AuthenticationFailed('User not found in DB.')

        return (user, None)

    def authenticate_header(self, request):
        """
        Returns the value for the `WWW-Authenticate` header in a 401 response.
        """
        return 'Bearer'


