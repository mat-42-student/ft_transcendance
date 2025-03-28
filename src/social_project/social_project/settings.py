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

# CACHES = {
#     # Cache for OAuth2 client credentials tokens (DB 1)
#     "default": {
#         "BACKEND": "django_redis.cache.RedisCache",
#         "LOCATION": "redis://redis:6379/0",
#         "OPTIONS": {
#             "CLIENT_CLASS": "django_redis.client.DefaultClient",
#         },
#         "KEY_PREFIX": "oauth_tokens",
#     }
# }
