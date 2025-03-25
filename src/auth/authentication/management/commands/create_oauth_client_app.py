# from django.core.management.base import BaseCommand
# from django.contrib.auth import get_user_model
# from oauth2_provider.models import Application
# import secrets
# import os

# User = get_user_model()

# class Command(BaseCommand):
#     def handle(self, *args, **options):
#         try:
#             user, _ = User.objects.get_or_create(username="system_user")
#         except Exception as e:
#             self.stdout.write(self.style.ERROR(f'Error creating system user: {e}'))
#             return
        
#         client_id = secrets.token_urlsafe(40)
#         client_secret = secrets.token_urlsafe(60)
        
#         app, created = Application.objects.update_or_create(
#             name="Shared Client",
#             defaults={
#                 "user": user,
#                 "client_id": client_id,
#                 "client_secret": client_secret,
#                 "client_type": Application.CLIENT_CONFIDENTIAL,
#                 "authorization_grant_type": Application.GRANT_CLIENT_CREDENTIALS,
#             }
#         )

#         credentials = {
#             "client_id": client_id,
#             "client_secret": client_secret
#         }

#         with open("/app/shared_credentials/.env", "w") as f:
#             f.write(f"OAUTH2_CCF_CLIENT_ID={credentials['client_id']}\n")
#             f.write(f"OAUTH2_CCF_CLIENT_SECRET={credentials['client_secret']}\n")

