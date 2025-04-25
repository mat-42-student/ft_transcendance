#!/usr/bin/env sh
set -e  # Exit immediately if any command fails

# ==== BEGIN VAULT BOOTSTRAP ====
SERVICE_NAME=${SERVICE_NAME:-"chat"}
VAULT_URL=${VAULT_URL:-"http://vault:8200"}
BOOTSTRAP_TOKEN_PATH=${BOOTSTRAP_TOKEN_PATH:-"/vault/file/${SERVICE_NAME}-bootstrap-token.txt"}
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
    echo "Fetching AppRole credentials..."
    CREDS_JSON=$(vault kv get -format=json kv/data/${SERVICE_NAME}-service/creds)
                 
    if [ $? -ne 0 ]; then
      echo "Failed to retrieve AppRole credentials"
      exit 1
    fi
    
    # Extract role_id and secret_id
    ROLE_ID=$(echo $CREDS_JSON | jq -r '.data.data.role_id')
    SECRET_ID=$(echo $CREDS_JSON | jq -r '.data.data.secret_id')
    
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
  else
    echo "ERROR: Bootstrap token not found at $BOOTSTRAP_TOKEN_PATH"
    exit 1
  fi
fi

# Execute the command passed to the entrypoint
echo "Starting $SERVICE_NAME service..."
exec "$@"