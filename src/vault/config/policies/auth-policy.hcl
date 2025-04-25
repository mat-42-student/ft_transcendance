# Policy for auth service

# Allow JWT operations using Transit
path "transit/sign/frontend-key/*" {
  capabilities = ["update"]
}

path "transit/verify/frontend-key/*" {
  capabilities = ["update"]
}

path "transit/sign/backend-key/*" {
  capabilities = ["update"]
}

path "transit/verify/backend-key/*" {
  capabilities = ["update"]
}

# Read JWT configurations
path "kv/data/jwt-config/*" {
  capabilities = ["read"]
}

# Read other service credentials for internal validations
path "kv/data/*/creds" {
  capabilities = ["read"]
}

# Limited ability to create service tokens
path "auth/token/create" {
  capabilities = ["create", "update"]
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
path "kv/data/auth-service/django-config" {
  capabilities = ["read"]
}