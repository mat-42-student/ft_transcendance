import os

DEBUG = True

ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    '.42mulhouse.fr', # All subdomains of 42mulhouse.fr
    'social',
]

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
