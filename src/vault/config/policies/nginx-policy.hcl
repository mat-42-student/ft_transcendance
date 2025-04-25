# Allow reading KV secrets
path "kv/data/nginx-service/*" {
  capabilities = ["read", "list"]
}

# Allow issuing certificates
path "pki/issue/services" {
  capabilities = ["create"]
}

# Read PKI role configuration
path "pki/roles/services" {
  capabilities = ["read"]
}

# Allow reading necessary PKI endpoints
path "pki/ca" {
  capabilities = ["read"]
}

# Add basic capabilities for performing the KV get operation
path "kv/metadata/nginx-service/creds" {
  capabilities = ["read", "list"]
}