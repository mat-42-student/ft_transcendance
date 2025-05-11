import os
from channels.auth import AuthMiddlewareStack #type:ignore
from channels.routing import ProtocolTypeRouter, URLRouter #type:ignore
from channels.security.websocket import AllowedHostsOriginValidator #type:ignore
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gateway_service.settings")
django_asgi_app = get_asgi_application()

from router.routing import websocket_urlpatterns
from router.middlewares import JWTAuthMiddleware

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddleware(
                AuthMiddlewareStack(
                    URLRouter(websocket_urlpatterns)
                )
            )
        ),
    }
)