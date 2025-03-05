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


CACHES = {
    # Cache for OAuth2 client credentials tokens (DB 1)
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://redis:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "oauth_tokens",
    }
}
