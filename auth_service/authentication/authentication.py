from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authentication import BaseAuthentication
from django.contrib.auth import get_user_model
import jwt
from rest_framework.authentication import BaseAuthentication

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        """
        Custom authentication class for JWT-based authentication.
        """
        auth_header = request.headers.get("Authorization", "")
        auth_prefix = settings.FRONTEND_JWT["AUTH_HEADER_PREFIX"]


        if not auth_header.startswith(auth_prefix):
            return None

        token = auth_header.split(" ")[-1]

        try:
            payload = jwt.decode(
                token,
                settings.FRONTEND_JWT["PUBLIC_KEY"],
                algorithms=[settings.FRONTEND_JWT["ALGORITHM"]],
            )

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

