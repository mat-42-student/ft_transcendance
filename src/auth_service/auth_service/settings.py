from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-r)*s-=2l!4jiwy_qk5xk+s)s9@l*$c8fb@!1k#!@u_nh7(yq=2'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')


JWT_PRIVATE_KEY = os.getenv("JWT_PRIVATE_KEY")
JWT_PUBLIC_KEY = os.getenv("JWT_PUBLIC_KEY")
JWT_ALGORITHM = 'RS256'

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
    'oauth2_provider',
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
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
        'authentication.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# OAuth2 Provider settings
OAUTH2_PROVIDER = {
    'SCOPES_BACKEND_CLASS': 'oauth2_provider.scopes.SettingsScopes',
    'ACCESS_TOKEN_EXPIRE_SECONDS': 3600,
    'SCOPES': {
        'read': 'Read access',
        'write': 'Write access',
    },
}

# OAuth 2.0 Authorization Code grant
OAUTH2_ACF_REDIRECT_URI = 'https://localhost:3000/api/v1/auth/oauth/callback/'
OAUTH2_ACF_CLIENT_ID = 'u-s4t2ud-42cc8fc914c6cc052826b177e11fa51f02e32acc8ffb2601fe88a36f65e4035b'
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
        "KEY_PREFIX": "tokens"
    }
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

STATIC_URL = 'static/'

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


