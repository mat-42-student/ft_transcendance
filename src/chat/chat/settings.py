# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []

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

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'API_chat.authentication.OAuth2IntrospectionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

OAUTH2_CCF_INTROSPECT_URL = 'https://localhost:3000/api/v1/auth/o/introspect/'
OAUTH2_CCF_TOKEN_URL = 'https://localhost:3000/api/v1/auth/o/token/'
OAUTH2_CCF_CLIENT_ID = 'Q4oWzkhULhhRe0QkjX939QgL48sYFujfewOcnhq4'
OAUTH2_CCF_CLIENT_SECRET = 'tMyCHhdoEWgho9rHIm0M3BAB581d3jhDz0HAtLQRcSsVyrQDlhuFm8SRuM0ShTTbxpUddXVbKpC7Ml5H9X3AXLmpRafXgTvAHXBce2qoFQIZTIUUcOjboEjelfJN7ECy'
