# Policy for chat service

# Verify JWT tokens
path "transit/verify/frontend-key/*" {
  capabilities = ["update"]
}

path "transit/verify/backend-key/*" {
  capabilities = ["update"]
}

# Read JWT configuration
path "kv/data/jwt-config/*" {
  capabilities = ["read"]
}

# Chat data storage in KV (example - adjust path as needed)
path "kv/data/chat/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Read its own credentials
path "kv/data/chat-service/creds" {
  capabilities = ["read"]
}

# Allow service to request certificates
path "pki/issue/services" {
  capabilities = ["create", "update"]
}

# Allow accessing database credentials
path "database/creds/auth" {
  capabilities = ["read"]
}

# Allow lease renewal
path "sys/leases/renew" {
  capabilities = ["update"]
}

# Allow accessing django secret key
path "kv/data/chat-service/django-config" {
  capabilities = ["read"]
}