from django.core.cache import cache
import os
from redis.asyncio import Redis
import httpx

# async def get_ccf_token():
#     url = os.getenv('OAUTH2_CCF_TOKEN_URL')
#     client_id = os.getenv('OAUTH2_CCF_CLIENT_ID')
#     client_secret = os.getenv('OAUTH2_CCF_CLIENT_SECRET')

#     async with httpx.AsyncClient() as client:
#         data = {
#             "grant_type": "client_credentials",
#             "client_id": client_id,
#             "client_secret": client_secret
#         }
#         response = await client.post(url, data=data)
#         response.raise_for_status()
#         token_data = response.json()
#         return token_data['access_token'], token_data.get('expires_in', 3600)

# async def get_ccf_token_cache():
#     redis = Redis.from_url("redis://redis:6379", decode_responses=True)
#     token = await redis.get('oauth_token')
#     if token:
#         return token
#     else:
#         new_token, expires_in = await get_ccf_token()
#         await redis.setex('oauth_token', expires_in - 60, new_token)
#         return new_token