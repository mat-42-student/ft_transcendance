#!/usr/bin/env sh
set -e  # Exit immediately if any command fails

# ==== BEGIN VAULT BOOTSTRAP ====
SERVICE_NAME=${SERVICE_NAME:-"nginx"}
VAULT_URL=${VAULT_URL:-"http://vault:8200"}
BOOTSTRAP_TOKEN_PATH=${BOOTSTRAP_TOKEN_PATH:-"/vault/file/${SERVICE_NAME}-bootstrap-token.txt"}
CERT_DIR=${CERT_DIR:-"/etc/nginx/ssl"}
SERVER_NAME=${SERVER_NAME:-"nginx.local"}
SERVER_IP=${SERVER_IP:-"127.0.0.1"}
HOSTNAME=$(hostname)
export VAULT_ADDR=$VAULT_URL

# Wait for Vault to be available
echo "Waiting for Vault to be available at $VAULT_URL..."
MAX_ATTEMPTS=15
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s -f "$VAULT_URL/v1/sys/health" > /dev/null 2>&1; then
    echo "Vault is available"
    break
  fi
  ATTEMPT=$((ATTEMPT+1))
  echo "Vault not available yet, waiting... (Attempt $ATTEMPT/$MAX_ATTEMPTS)"
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "ERROR: Could not connect to Vault after $MAX_ATTEMPTS attempts. Exiting."
  exit 1
else
  # Check if bootstrap token file exists
  if [ -f "$BOOTSTRAP_TOKEN_PATH" ]; then
    echo "Found bootstrap token for $SERVICE_NAME"
    # Read the bootstrap token and set it as VAULT_TOKEN
    BOOTSTRAP_TOKEN=$(cat "$BOOTSTRAP_TOKEN_PATH")
    export VAULT_TOKEN=$BOOTSTRAP_TOKEN
    echo "Bootstrap token loaded successfully"
    
    # Get AppRole credentials
    ROLE_ID=$(curl -s \
      -H "X-Vault-Token: $BOOTSTRAP_TOKEN" \
      $VAULT_URL/v1/auth/approle/role/nginx-service/role-id | jq -r '.data.role_id')

    # Generate a new secret_id using Vault API
    SECRET_ID=$(curl -s \
      -X POST \
      -H "X-Vault-Token: $BOOTSTRAP_TOKEN" \
      $VAULT_URL/v1/auth/approle/role/nginx-service/secret-id | jq -r '.data.secret_id')

    # Verify we got values
    if [ -z "$ROLE_ID" ] || [ "$ROLE_ID" = "null" ] || [ -z "$SECRET_ID" ] || [ "$SECRET_ID" = "null" ]; then
      echo "Failed to retrieve AppRole credentials from Vault API"
      exit 1
    fi
    
    # Authenticate with AppRole
    echo "Authenticating with AppRole..."
    AUTH_RESP=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "{\"role_id\":\"$ROLE_ID\",\"secret_id\":\"$SECRET_ID\"}" \
      $VAULT_URL/v1/auth/approle/login)
    
    # Extract token
    NEW_TOKEN=$(echo $AUTH_RESP | jq -r '.auth.client_token')
    if [ -z "$NEW_TOKEN" ] || [ "$NEW_TOKEN" = "null" ]; then
      echo "AppRole login failed"
      echo "$AUTH_RESP"
      exit 1
    fi
    
    export VAULT_TOKEN=$NEW_TOKEN
    echo "Successfully authenticated with Vault using AppRole"

    # ==== BEGIN CERTIFICATE GENERATION ====
    # Create certificate directory if it doesn't exist
    mkdir -p $CERT_DIR

    IP_LIST=$(hostname -i 2>/dev/null || ip -4 addr | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | tr '\n' ',')

    # Request a new certificate from Vault PKI with IP SANs
    echo "Requesting certificate for $SERVER_NAME (IP: $SERVER_IP, Hostname: $HOSTNAME) from Vault PKI..."
    CERT_RESPONSE=$(curl -s \
      -H "X-Vault-Token: $VAULT_TOKEN" \
      -H "Content-Type: application/json" \
      -X POST \
      -d "{
          \"common_name\":\"$SERVER_NAME\",
          \"alt_names\":\"localhost,$HOSTNAME\",
          \"ip_sans\":\"$SERVER_IP,$IP_LIST\",
          \"ttl\":\"720h\"
        }" \
      $VAULT_URL/v1/pki/issue/services)

    # Log the certificate response for debugging
    echo "Certificate Response:"
    echo "$CERT_RESPONSE"

    # Check if certificate request was successful
    if [ -z "$CERT_RESPONSE" ] || [ "$(echo $CERT_RESPONSE | jq -r '.errors // empty')" != "" ]; then
      echo "Failed to obtain certificate from Vault PKI"
      echo "Response: $CERT_RESPONSE"
      exit 1
    fi

    # Extract certificate, private key, and CA chain
    echo "Certificate obtained successfully, writing to files..."
    echo "$CERT_RESPONSE" | jq -r '.data.certificate' > $CERT_DIR/nginx.crt
    echo "$CERT_RESPONSE" | jq -r '.data.private_key' > $CERT_DIR/nginx.key
    echo "$CERT_RESPONSE" | jq -r '.data.issuing_ca' > $CERT_DIR/issuing_ca.crt
    
    # Try to extract CA chain if available
    CA_CHAIN=$(echo "$CERT_RESPONSE" | jq -r '.data.ca_chain // empty')
    if [ -n "$CA_CHAIN" ]; then
      echo "$CERT_RESPONSE" | jq -r '.data.ca_chain | join("\n")' > $CERT_DIR/ca_chain.crt
    else
      # If no ca_chain, use the issuing_ca as the chain
      cp $CERT_DIR/issuing_ca.crt $CERT_DIR/ca_chain.crt
    fi

    # Set appropriate permissions
    chmod 600 $CERT_DIR/nginx.key
    chmod 644 $CERT_DIR/nginx.crt $CERT_DIR/issuing_ca.crt $CERT_DIR/ca_chain.crt

    echo "TLS certificate and key have been saved to $CERT_DIR"
    ls -la $CERT_DIR
    # ==== END CERTIFICATE GENERATION ====

    # Copy the CA certificate to the expected location
    mkdir -p /etc/nginx/ssl
    cp /vault/file/ca.crt /etc/nginx/ssl/ca.crt
    chmod 644 /etc/nginx/ssl/ca.crt

  else
    echo "ERROR: Bootstrap token not found at $BOOTSTRAP_TOKEN_PATH"
    exit 1
  fi
fi

# Execute the command passed to the entrypoint
echo "Starting $SERVICE_NAME service..."
exec "$@"
    
