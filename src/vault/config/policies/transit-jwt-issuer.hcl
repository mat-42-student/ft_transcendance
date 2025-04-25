# Policy to allow services to use Transit for JWT operations

# Allow reading Transit keys configuration
path "transit/keys/frontend-key" {
  capabilities = ["read"]
}

path "transit/keys/backend-key" {
  capabilities = ["read"]
}

# Allow signing operations with Transit keys
path "transit/sign/frontend-key/*" {
  capabilities = ["update"]
}

path "transit/sign/backend-key/*" {
  capabilities = ["update"]
}

# Allow verification operations with Transit keys
path "transit/verify/frontend-key/*" {
  capabilities = ["update"]
}

path "transit/verify/backend-key/*" {
  capabilities = ["update"]
}

# Read JWT configuration from KV store
path "kv/data/jwt-config/*" {
  capabilities = ["read"]
}
