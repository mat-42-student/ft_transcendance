from django.core.cache import caches
from django.conf import settings
import jwt
from datetime import datetime
import secrets
from redis import Redis
import json
import time

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

def getStatus(user_id, channel="auth_social"):
    """
    Evaluate if a user is already logged in.
    """
    redis = Redis.from_url("redis://redis:6379", decode_responses=True)

    test = 10
    data = {
        'user_id': user_id
    }
    status = None
    print(data)  # debug
    
    redis.publish(channel, json.dumps(data))
    
    while status is None and test >= 0:
        try:
            status = redis.get(f'is_{user_id}_logged')
            print(f'GET status = {status}')  # debug
            if status is not None:
                return status
        except Exception as e:
            print(f"Error occurred: {str(e)}")
            return None
        
        time.sleep(0.1)
        test -= 1
    
    return None