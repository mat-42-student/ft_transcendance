#!/bin/sh
set -e

vault server -config=/vault/config/vault.hcl &
VAULT_PID=$!

export VAULT_ADDR="http://127.0.0.1:8200"

attempts=0
max_attempts=10
while [ $attempts -lt $max_attempts ]; do
  if nc -z 127.0.0.1 8200; then
    echo "Vault server is now available"
    break
  fi
  attempts=$((attempts+1))
  echo "Waiting for Vault to start... Attempt $attempts/$max_attempts"
  sleep 2
done

if [ $attempts -ge $max_attempts ]; then
  echo "Vault failed to start within the allowed time"
  exit 1
fi

# Initialize Vault if not already initialized
if [ ! -f /vault/file/init.json ]; then
  echo "Initializing Vault"
  vault operator init -key-shares=1 -key-threshold=1 -format=json > /vault/file/init.json
fi

# Extract unseal key and root token
UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /vault/file/init.json)
ROOT_TOKEN=$(jq -r '.root_token' /vault/file/init.json)

# Unseal Vault
echo "Unsealing Vault with provided key"
vault operator unseal $UNSEAL_KEY

# Login with root token
export VAULT_TOKEN=$ROOT_TOKEN
echo "Logging in with root token"
vault login $ROOT_TOKEN

############### ENABLE KV SECRETS ENGINE ###############
echo "Enabling KV secrets engine"
vault secrets enable -version=2 kv

# Store OAuth credentials
vault kv put kv/oauth \
  client_id="${OAUTH_CLIENT_ID}" \
  client_secret="${OAUTH_CLIENT_SECRET}"

############### ENABLE TRANSIT SECRETS ENGINE ###############
vault secrets enable transit

# Create keys for JWT signing in Transit with different rotation periods
# Frontend key (for both access and refresh tokens)
vault write -f transit/keys/frontend-key \
  type=rsa-2048 \
  exportable=false

# Set frontend key rotation period
vault write transit/keys/frontend-key/config \
  deletion_allowed=false \
  min_decryption_version=1 \
  min_encryption_version=1 \
  auto_rotate_period="720h"

# Backend key (service-to-service)
vault write -f transit/keys/backend-key \
  type=rsa-2048 \
  exportable=false

# Set backend key rotation period
vault write transit/keys/backend-key/config \
  deletion_allowed=false \
  min_decryption_version=1 \
  min_encryption_version=1 \
  auto_rotate_period="168h"

# Create KV entries to store JWT configuration parameters
# These will be used to determine token properties

# Frontend Access Token Configuration
vault kv put kv/jwt-config/frontend-access \
  key_name="frontend-key" \
  issuer="frontend-service" \
  audience="frontend-api" \
  token_type="access" \
  ttl="15m" \
  max_ttl="30m" \
  allowed_claims="sub,user_id,email,roles,id,username,oauth,avatar"

# Frontend Refresh Token Configuration
vault kv put kv/jwt-config/frontend-refresh \
  key_name="frontend-key" \
  issuer="frontend-service" \
  audience="frontend-api" \
  token_type="refresh" \
  ttl="7d" \
  max_ttl="30d" \
  allowed_claims="sub,user_id,email,roles,id,username,oauth,avatar"

# Backend Service Token Configuration
vault kv put kv/jwt-config/backend-service \
  key_name="backend-key" \
  issuer="internal-services" \
  audience="internal-api" \
  token_type="service" \
  ttl="1h" \
  max_ttl="24h" \
  allowed_claims="sub,user_id,email,roles,id,username,oauth,avatar"

# Write the Transit policy for JWT operations
vault policy write transit-jwt-issuer /vault/config/policies/transit-jwt-issuer.hcl

############### ENABLE PKI SECRETS ENGINE ###############
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki

# Generate root certificate
vault write -field=certificate pki/root/generate/internal \
    common_name="pki-ca-root" \
    ttl=87600h > /vault/file/ca.crt

# Configure CA and CRL URLs
vault write pki/config/urls \
    issuing_certificates="http://vault:8200/v1/pki/ca" \
    crl_distribution_points="http://vault:8200/v1/pki/crl"

# Create PKI role for services
vault write pki/roles/services \
    allowed_domains="local,internal,$(hostname),.local" \
    allow_subdomains=true \
    allow_localhost=true \
    allow_ip_sans=true \
    allow_any_name=true \
    enforce_hostnames=false \
    max_ttl=720h

vault policy write pki-cert-issuer /vault/config/policies/pki-policy.hcl

############### ENABLE DATABASE SECRETS ENGINE ###############
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/postgres \
    plugin_name=postgresql-database-plugin \
    allowed_roles="auth,users,chat,social,matchmaking,pong,gateway,nginx" \
    connection_url="postgresql://{{username}}:{{password}}@postgres:5432/ft_transcendance?sslmode=disable" \
    username="${POSTGRES_USER}" \
    password="${POSTGRES_PASSWORD}"

# Create a readonly role
vault write database/roles/readonly \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
                        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create a readwrite role
vault write database/roles/readwrite \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
                        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create service-specific roles with appropriate permissions
for service in auth users matchmaking; do
  vault write database/roles/${service} \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
                        GRANT USAGE, CREATE ON SCHEMA public TO \"{{name}}\"; \
                        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
                        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
done

############### ENABLE APPROLE AUTHENTICATION ###############

vault auth enable approle

for service in nginx auth users chat social matchmaking pong gateway; do
  echo "Setting up ${service}-service..."

  # Generate a random secret key
  DJANGO_SECRET=$(openssl rand -base64 32)
  
  # Store Django secret in KV store
  vault kv put kv/${service}-service/django-config \
    secret_key="${DJANGO_SECRET}"

  # Create the main service policy
  vault policy write ${service}-policy /vault/config/policies/${service}-policy.hcl
  
  # Create the service-specific bootstrap policy
  vault policy write ${service}-bootstrap-policy /vault/config/policies/${service}-bootstrap-policy.hcl

  # Create AppRole
  vault write auth/approle/role/${service}-service \
    token_policies="${service}-policy,pki-cert-issuer" \
    token_ttl=1h \
    token_max_ttl=24h \
    secret_id_ttl=24h

  # Create service-specific bootstrap token
  SERVICE_BOOTSTRAP_TOKEN=$(vault token create \
    -policy=${service}-bootstrap-policy \
    -ttl=1h \
    -format=json | jq -r '.auth.client_token')

  # Store service-specific bootstrap token securely
  # echo "$SERVICE_BOOTSTRAP_TOKEN" | gpg --batch --yes --symmetric --cipher-algo AES256 \
  #   --output /vault/file/${service}-bootstrap-token.gpg \
  #   --passphrase "${VAULT_SECRET_PASS}"
  
  echo "$SERVICE_BOOTSTRAP_TOKEN" > /vault/file/${service}-bootstrap-token.txt
  chmod 600 /vault/file/${service}-bootstrap-token.txt

  echo "Created service-specific bootstrap token for ${service}-service"
done

# Enable Audit Logging
vault audit enable file file_path=/var/log/vault.log format=json

echo "Vault setup complete, keeping container running..."
# Keep the container running
wait $VAULT_PID