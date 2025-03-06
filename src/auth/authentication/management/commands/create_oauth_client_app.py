# import json
# import logging
# import hvac
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from oauth2_provider.models import Application
import secrets

User = get_user_model()

# logger = logging.getLogger(__name__)

class Command(BaseCommand):
    # help = "Creates OAuth application and stores credentials in Vault"

    # def store_in_vault(self, credentials):
    #     try:
    #         # Initialize Vault client
    #         client = hvac.Client(url='https://vault.example.com', token='your_vault_token')
            
    #         # Create or update secret in Vault
    #         client.secrets.kv.v2.create_or_update_secret(
    #             path='oauth/shared_client',  # Path to store the secret
    #             secret=credentials            # The credentials to store
    #         )
    #         self.stdout.write(self.style.SUCCESS('Credentials stored in Vault.')) 
    #     except Exception as e:
    #         self.stdout.write(self.style.ERROR(f'Error storing credentials in Vault: {e}'))

    def handle(self, *args, **options):
        try:
            user, _ = User.objects.get_or_create(username="system_user")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating system user: {e}'))
            return
        
        client_id = secrets.token_urlsafe(40)
        client_secret = secrets.token_urlsafe(60)
        
        app, created = Application.objects.update_or_create(
            name="Shared Client",
            defaults={
                "user": user,
                "client_id": client_id,
                "client_secret": client_secret,
                "client_type": Application.CLIENT_CONFIDENTIAL,
                "authorization_grant_type": Application.GRANT_CLIENT_CREDENTIALS,
            }
        )

        credentials = {
            "client_id": client_id,
            "client_secret": client_secret
        }

        with open("/shared_credentials/.env", "w") as f:
            f.write(f"OAUTH2_CCF_CLIENT_ID={credentials['client_id']}\n")
            f.write(f"OAUTH2_CCF_CLIENT_SECRET={credentials['client_secret']}\n")

        # Log credentials
        # logger.info(json.dumps(credentials))

        # self.store_in_vault(credentials)
        
        # self.stdout.write(self.style.SUCCESS('OAuth application created/updated successfully!'))


