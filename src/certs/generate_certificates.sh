#!/bin/bash
# filepath: /home/nlence-l/code/git/ft_transcendance/src/certs/generate_certificates.sh

set -e  # Exit on any error

# Clear terminal
clear
echo "=========================================================="
echo "        Certificate Generation for Transcendance"
echo "=========================================================="

# Define directories
BASE_DIR="$(pwd)"
CA_DIR="${BASE_DIR}/ca"
SERVICES_DIR="${BASE_DIR}/services"

# Create directories
mkdir -p "$CA_DIR"
mkdir -p "$SERVICES_DIR"

# List of services from docker-compose.yml
SERVICES=("auth" "users" "chat" "social" "gateway" "matchmaking" "pong" "nginx")

echo "Creating Certificate Authority (CA)..."

# Generate CA private key
openssl genrsa -out "${CA_DIR}/ca.key" 2048

# Generate CA certificate with proper extensions
cat > "${CA_DIR}/ca.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
x509_extensions = v3_ca
prompt = no

[req_distinguished_name]
CN = Transcendance Root CA

[v3_req]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign,digitalSignature

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign,digitalSignature
EOF

# Generate CA certificate
openssl req -new -x509 -days 3650 -key "${CA_DIR}/ca.key" -out "${CA_DIR}/ca.crt" \
  -config "${CA_DIR}/ca.cnf" -extensions v3_ca

echo "CA certificate created successfully."
echo "----------------------------------------------------------"

# Generate certificates for each service
for SERVICE in "${SERVICES[@]}"; do
  echo "Generating certificate for $SERVICE..."
  
  # Create service directory
  SERVICE_DIR="${SERVICES_DIR}/${SERVICE}"
  mkdir -p "$SERVICE_DIR"
  
  # Generate private key
  openssl genrsa -out "${SERVICE_DIR}/${SERVICE}.key" 2048
  
  # Create certificate configuration
  cat > "${SERVICE_DIR}/${SERVICE}.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${SERVICE}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${SERVICE}
DNS.2 = localhost
EOF
  
  # Generate CSR (Certificate Signing Request)
  openssl req -new -key "${SERVICE_DIR}/${SERVICE}.key" \
    -out "${SERVICE_DIR}/${SERVICE}.csr" \
    -config "${SERVICE_DIR}/${SERVICE}.cnf"
  
  # Sign the certificate with our CA
  openssl x509 -req -in "${SERVICE_DIR}/${SERVICE}.csr" \
    -CA "${CA_DIR}/ca.crt" -CAkey "${CA_DIR}/ca.key" -CAcreateserial \
    -out "${SERVICE_DIR}/${SERVICE}.crt" \
    -days 825 \
    -extfile "${SERVICE_DIR}/${SERVICE}.cnf" \
    -extensions v3_req
  
  # Clean up CSR file
  rm "${SERVICE_DIR}/${SERVICE}.csr"
  
  echo "Certificate for $SERVICE generated successfully."
  echo "----------------------------------------------------------"
done

# Display certificate information for verification
echo "Verifying CA certificate:"
openssl x509 -in "${CA_DIR}/ca.crt" -text -noout | grep -E "Issuer:|Subject:|X509v3 Basic Constraints:|X509v3 Key Usage:"

echo ""
echo "Verifying one of the service certificates (auth):"
openssl x509 -in "${SERVICES_DIR}/auth/auth.crt" -text -noout | grep -E "Issuer:|Subject:|X509v3 Basic Constraints:|X509v3 Key Usage:|X509v3 Extended Key Usage:|X509v3 Subject Alternative Name:"

echo ""
echo "=========================================================="
echo "Certificate generation completed successfully!"
echo "CA and service certificates have been created in: $(pwd)"
echo "=========================================================="

# Set proper permissions
chmod 644 "${CA_DIR}/ca.crt"
chmod 600 "${CA_DIR}/ca.key"

for SERVICE in "${SERVICES[@]}"; do
  chmod 644 "${SERVICES_DIR}/${SERVICE}/${SERVICE}.crt"
  chmod 600 "${SERVICES_DIR}/${SERVICE}/${SERVICE}.key"
done

echo "Certificate permissions have been set correctly."