import secrets

def generate_state():
    return secrets.token_urlsafe(32)
