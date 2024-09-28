from django.urls import re_path
from .consumers import PongConsumer

websocket_urlpatterns = [
    re_path(r"game/(?P<game_id>[0-9]+)/(?P<player_id>\w+)/$", PongConsumer.as_asgi()),
]

  # re_path(r"ws/chat/(?P<room_name>\w+)/$", PongConsumer.as_asgi()),