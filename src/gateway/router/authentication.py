from django.conf import settings
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication
from django.contrib.auth import get_user_model
import requests

User = get_user_model()
    
class OAuth2IntrospectionAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        access_token = auth_header.split(' ')[1]

        introspection_url = getattr(settings, 'OAUTH2_CCF_INTROSPECT_URL', None)
        client_id = getattr(settings, 'OAUTH2_CCF_CLIENT_ID', None)
        client_secret = getattr(settings, 'OAUTH2_CCF_CLIENT_SECRET', None)

        if not introspection_url or not client_id or not client_secret:
            raise exceptions.AuthenticationFailed('OAuth2 introspection settings not configured properly.')

        try:
            response = requests.post(
                introspection_url,
                data={'token': access_token},
                auth=(client_id, client_secret),
                timeout=5
            )
        except requests.RequestException:
            raise exceptions.AuthenticationFailed('Failed to contact introspection endpoint.')

        if response.status_code != 200:
            raise exceptions.AuthenticationFailed('Introspection endpoint returned an error.')

        token_data = response.json()

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


