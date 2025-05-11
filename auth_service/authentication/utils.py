from django.core.cache import caches
from django.conf import settings
import jwt
from datetime import datetime
import secrets

redis_cache = caches['default']

def generate_state():
    return secrets.token_urlsafe(32)

def revoke_token(token):
    """
    Add a token to the Redis blacklist with TTL = remaining validity time.
    """
    try:
        # Decode the token to get its expiration time
        payload = jwt.decode(token, options={"verify_signature": False})
        exp_timestamp = payload.get('exp')
        if exp_timestamp:
            now = datetime.now().timestamp()
            ttl = int(exp_timestamp - now)
            if ttl > 0:
                redis_cache.set(token, "revoked", timeout=ttl)
                return True
        return False
    except jwt.ExpiredSignatureError:
        return False

def is_token_revoked(token):
    """
    Check if a token is revoked.
    """
    return redis_cache.get(token) == "revoked"
