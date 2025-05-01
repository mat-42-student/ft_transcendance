from django.apps import AppConfig
import os
import logging
import signal
from django.conf import settings


class AuthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authentication'
    
    def ready(self):
        # Avoid running twice in development when Django auto-reloads
        if os.environ.get('RUN_MAIN') == 'true' or os.environ.get('RUN_MAIN') is None:
            try:
                # Import and initialize Django config from Vault
                from utils.vault_config import initialize_django_config
                
                # Store the vault client in settings for reuse across views
                settings.vault_client = initialize_django_config()
                
                # Initialize DB manager if needed
                if hasattr(settings, 'vault_client') and settings.vault_client:
                    from utils.vault_db import VaultDBManager
                    settings.db_manager = VaultDBManager(settings.vault_client)
                    
                    # Register cleanup handlers
                    self._register_cleanup_handlers()
                    
                    logging.info("Vault integration initialized successfully")
            except Exception as e:
                logging.error(f"Error initializing Vault integration: {e}")
                # Continue app startup even if Vault integration fails
    
    def _register_cleanup_handlers(self):
        """Register handlers to clean up Vault resources on shutdown"""
        
        def handle_shutdown(*args, **kwargs):
            """Clean up Vault-related resources on shutdown"""
            logging.info("Cleaning up Vault resources...")
            try:
                if hasattr(settings, 'db_manager') and settings.db_manager:
                    settings.db_manager.cleanup()
                logging.info("Vault resources cleaned up successfully")
            except Exception as e:
                logging.error(f"Error cleaning up Vault resources: {e}")
        
        # Register signal handlers for various termination scenarios
        signal.signal(signal.SIGTERM, handle_shutdown)
        signal.signal(signal.SIGINT, handle_shutdown)