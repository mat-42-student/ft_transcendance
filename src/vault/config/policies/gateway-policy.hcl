# Policy for gateway service (API Gateway)

# Verify JWT tokens from all sources
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

# Gateway metrics and configuration
path "kv/data/gateway/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Read its own credentials
path "kv/data/gateway-service/creds" {
  capabilities = ["read"]
}

# Allow gateway to fetch service health status
path "sys/health" {
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
path "kv/data/gateway-service/django-config" {
  capabilities = ["read"]
}