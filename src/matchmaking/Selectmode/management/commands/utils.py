from django.core.cache import cache
import os
import requests

def get_ccf_token():
    url = os.getenv('OAUTH2_CCF_TOKEN_URL')
    client_id = os.getenv('OAUTH2_CCF_CLIENT_ID')
    client_secret = os.getenv('OAUTH2_CCF_CLIENT_SECRET')

    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    data = {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret
    }

    try:
        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()
        token_data = response.json()
        return token_data['access_token'], token_data.get('expires_in', 3600)
    except requests.exceptions.RequestException as e:
        print(f"Error in request : {e}")

def get_ccf_token_cache():
    token = cache.get('oauth_token')
    if token:
        return token
    else:
        # Fetch new token from auth service
        new_token, expires_in = get_ccf_token()
        cache.set('oauth_token', new_token, expires_in - 60)
        return new_token