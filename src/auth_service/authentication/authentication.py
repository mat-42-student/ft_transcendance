from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from django.conf import settings

def verify_jwt_token(token: str):
    try:
        decoded = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
        return decoded
    except ExpiredSignatureError:
        raise ValueError("Token has expired")
    except InvalidTokenError:
        raise ValueError("Invalid token")

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None

        if not auth_header.startswith("Bearer "):
            raise AuthenticationFailed("Invalid Authorization header")

        token = auth_header.split(" ")[1]
        try:
            payload = verify_jwt_token(token)
        except ValueError as e:
            raise AuthenticationFailed(str(e))
        

        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationFailed("Invalid token payload")

        user = {"id": user_id, "username": payload.get("username")}
        return (user, None)
    
# authentication_classes = [JWTAuthentication]
# permission_classes = [IsAuthenticated]