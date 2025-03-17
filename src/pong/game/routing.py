from django.urls import re_path
from .PongConsumers import PongConsumer
from .NoConsumer import NoConsumer

websocket_urlpatterns = [
    re_path(r"game/(?P<game_id>[0-9]+)/$", PongConsumer.as_asgi()),
    re_path(r"^.*$", NoConsumer.as_asgi()),
]