import logging
import os
from django.conf import settings
from .vault_client import VaultClient

def initialize_django_config():
    """Fetch Django configuration from Vault"""
    vault_client = VaultClient()
    
    # Get the Django configuration from Vault
    try:
        config_path = f"{settings.SERVICE_NAME}-service/django-config"
        config = vault_client.get_kv_secret(config_path)
        
        # Update Django settings with the fetched secret key
        settings.SECRET_KEY = config['secret_key']
        
        logging.info(f"Initialized Django config from Vault for {settings.SERVICE_NAME}")
        
        # Return the vault client for further use
        return vault_client
    except Exception as e:
        logging.error(f"Error initializing Django config: {str(e)}")
        
        # Fallback to environment variable if available
        if hasattr(settings, 'SECRET_KEY') and settings.SECRET_KEY:
            logging.warning("Using SECRET_KEY from environment as fallback")
        else:
            # If no SECRET_KEY is available, raise the exception
            raise