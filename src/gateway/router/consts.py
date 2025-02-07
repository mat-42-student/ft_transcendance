import requests

REDIS_GROUPS = {
    'chat': 'deep_chat',
    'mmaking': 'deep_mmaking',
    'social': 'deep_social',
}

response = requests.get(f"http://users:8000/api/v1/auth/public-key/?form=oneline")
if response.status_code == 200:
    JWT_PUBLIC_KEY = response.text  # Or response.json()
else:
    raise RuntimeError("Could not get JWT public key")