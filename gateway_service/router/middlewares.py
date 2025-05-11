from urllib.parse import parse_qs
import jwt
import requests
from django.conf import settings

class JWTAuthMiddleware:
    """Middleware ASGI to authentify WebSocket connection with JWT."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("t", [None])[0]

        if token:
            try:
                public_key = self.get_public_key()
                payload = jwt.decode(token, public_key, algorithms=["RS256"])
                scope["payload"] = payload
            except jwt.ExpiredSignatureError:
                print("Token expired")
                scope["payload"] = None
            except jwt.InvalidTokenError:
                print("Token invalide")
                scope["payload"] = None
        else:
            print("Aucun token trouvé")
            scope["payload"] = None

        return await self.app(scope, receive, send)

    def get_public_key(self):
        try:
            url = "https://nginx:8443/api/v1/auth/public-key/"
            response = requests.get(
                url,
                timeout=10,
                cert=("/etc/ssl/gateway.crt", "/etc/ssl/gateway.key"),
                verify="/etc/ssl/ca.crt"
            )
            
            if response.status_code == 200:
                return response.json().get("public_key")
            else:
                raise RuntimeError("Impossible de récupérer la clé publique JWT")
        except RuntimeError as e:
            print(e)
            raise(e)