from pathlib import Path
import os


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("AUTH_SERVICE_DJANGO_SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = [
    'nginx',
    '.42mulhouse.fr',
    'localhost',
    '127.0.0.1',
]

FRONTEND_JWT = {
    "PUBLIC_KEY": os.getenv("JWT_PUBLIC_KEY"),
    "PRIVATE_KEY": os.getenv("JWT_PRIVATE_KEY"),
    "ALGORITHM": "RS256",
    "AUTH_HEADER_PREFIX": "Bearer",
}

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'authentication',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'authentication.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# OAuth 2.0 Authorization Code grant
OAUTH2_ACF_REDIRECT_URI = 'https://localhost:3000/api/v1/auth/oauth/callback/'
OAUTH2_ACF_CLIENT_ID = 'u-s4t2ud-e67daca7ed4b4e6fb9397d6f7b1ee0c2cd81dd3dda313a57d17975145ad21738'
OAUTH2_ACF_CLIENT_SECRET = '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'

ROOT_URLCONF = 'auth_service.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'auth_service.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'transcendance',
        'USER': 'toto',
        'PASSWORD': 'test',
        'HOST': 'postgres',
        'PORT': '5432',
    }
}

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://redis:6379/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "jwt_refresh_tokens",
    },
}



AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CSRF_TRUSTED_ORIGINS = ['https://localhost:3000']

AUTH_USER_MODEL = 'authentication.User'

# CORS settings
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:5500",
#     "http://127.0.0.1:5500",
# ]
# CORS_ALLOW_ALL_ORIGINS = True

CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


