from django.urls import re_path
from .consumers import GatewayConsumer

websocket_urlpatterns = [
    re_path(r"ws/$", GatewayConsumer.as_asgi()),
]