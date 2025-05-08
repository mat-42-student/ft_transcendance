import os


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("django-insecure-r)*s-=2l!4jiwy_qk5xk+s)s9@l*$C8fb@!1k#!@u_nh7(yq=2")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = [
    'nginx',
    '.42mulhouse.fr',
    'localhost',
    '127.0.0.1',
]

# Application definition

INSTALLED_APPS = [
    'social',
]

REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [{"host": "redis", "port": 6379, "password": REDIS_PASSWORD}],
        },
    },
}

BACKEND_JWT = {
    "PUBLIC_KEY": os.getenv("BACKEND_JWT_PUBLIC_KEY"),
    "PRIVATE_KEY": os.getenv("BACKEND_JWT_PRIVATE_KEY"),
    "ALGORITHM": "RS256",
    "AUTH_HEADER_PREFIX": "Service",
}