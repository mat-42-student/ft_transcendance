import os
DEBUG = True

ALLOWED_HOSTS = ['*']

# Application definition

INSTALLED_APPS = [
    'API_chat',
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
    "AUTH_HEADER_PREFIX": "Service",
}

# Vault settings
SERVICE_NAME = os.environ.get('SERVICE_NAME', 'chat')
VAULT_URL = os.environ.get('VAULT_URL', 'http://vault:8200')
VAULT_BOOTSTRAP_TOKEN = os.environ.get('VAULT_BOOTSTRAP_TOKEN')