import os

DEBUG = True

ALLOWED_HOSTS = []

# Application definition

INSTALLED_APPS = [
    'social',
]

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis", 6379)],
        },
    },
}

# OAuth 2.0 Client Credentials flow
OAUTH2_CCF_TOKEN_URL = os.getenv("OAUTH2_CCF_TOKEN_URL")
OAUTH2_CCF_CLIENT_ID = os.getenv("OAUTH2_CCF_CLIENT_ID")
OAUTH2_CCF_CLIENT_SECRET = os.getenv("OAUTH2_CCF_CLIENT_SECRET")