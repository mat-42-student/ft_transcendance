from django.urls import re_path
from .consumers import PongConsumer

websocket_urlpatterns = [
    re_path(r"game/(?P<game_id>[0-9]+)/$", PongConsumer.as_asgi()),
]