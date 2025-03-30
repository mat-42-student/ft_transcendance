import os

DEBUG = True

ALLOWED_HOSTS = ['*']

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

BACKEND_JWT = {
    "PUBLIC_KEY": os.getenv("BACKEND_JWT_PUBLIC_KEY"),
    "PRIVATE_KEY": os.getenv("BACKEND_JWT_PRIVATE_KEY"),
    "ALGORITHM": "RS256",
    "AUTH_HEADER_PREFIX": "Service",
}