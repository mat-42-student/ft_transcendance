from pathlib import Path
import os
import logging

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: Initial secret key, will be replaced by Vault
# Using a placeholder that will be overwritten
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'placeholder-that-will-be-replaced-by-vault')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Vault settings
SERVICE_NAME = os.environ.get('SERVICE_NAME', 'auth')
VAULT_URL = os.environ.get('VAULT_URL', 'http://vault:8200')

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB', 'ft_transcendance'),
        'USER': os.getenv('POSTGRES_USER', 'alice'),  # Default value until Vault sets it
        'PASSWORD': os.getenv('POSTGRES_PASSWORD', ''),  # Default value until Vault sets it
        'HOST': os.getenv('POSTGRES_HOST', 'postgres'),
        'PORT': os.getenv('POSTGRES_PORT', '5432'),
    }
}

FRONTEND_JWT = {
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


OAUTH_REDIRECT_URI = 'https://localhost:3000/api/v1/auth/oauth/callback/'


ROOT_URLCONF = 'auth.urls'

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

WSGI_APPLICATION = 'auth.wsgi.application'

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

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CSRF_TRUSTED_ORIGINS = ['https://localhost:3000']

AUTH_USER_MODEL = 'authentication.User'

# CORS settings
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler()]
)

# Initialize Vault clients after settings are loaded
# This should be at the end of the file
import atexit

# Deferred import to avoid circular import issues
def init_vault():
    try:
        # Import Vault modules
        from utils.vault_client import VaultClient
        from utils.vault_db import VaultDBManager
        
        # Initialize Vault client (uses VAULT_TOKEN from environment)
        global vault_client
        vault_client = VaultClient()
        
        # Initialize VaultDBManager for dynamic database credentials
        global db_manager
        db_manager = VaultDBManager(vault_client)
        
        # Get Django secret key from Vault
        try:
            config_path = f"{SERVICE_NAME}-service/django-config"
            config = vault_client.get_kv_secret(config_path)
            # Update Django settings with the fetched secret key
            global SECRET_KEY
            SECRET_KEY = config.get('secret_key', SECRET_KEY)
            logging.info(f"Initialized Django config from Vault for {SERVICE_NAME}")
        except Exception as e:
            logging.warning(f"Could not fetch Django secret key from Vault: {e}")
            # Continue using the environment variable
        
        # Register cleanup function
        def cleanup():
            """Clean up resources on shutdown"""
            if 'db_manager' in globals():
                try:
                    logging.info("Cleaning up Vault resources")
                    db_manager.cleanup()
                except Exception as e:
                    logging.error(f"Error during cleanup: {e}")
                    
        atexit.register(cleanup)
        
        return True
    except Exception as e:
        logging.error(f"Failed to initialize Vault integration: {e}")
        return False

# Initialize Vault if not running in test mode
if not os.environ.get('DJANGO_RUNNING_TESTS'):
    init_vault()