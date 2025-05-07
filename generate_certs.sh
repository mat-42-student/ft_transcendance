#!/bin/bash
# filepath: generate_proper_certs.sh

set -e  # Exit on error

# Create directories
mkdir -p certs/ca
mkdir -p certs/services/{auth,chat,gateway,matchmaking,nginx,pong,social,users}

# Generate CA key and certificate with proper key usage extensions
openssl genrsa -out certs/ca/ca.key 4096

# Create a CA configuration file with key usage extensions
cat > certs/ca/ca.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_ca
prompt = no

[req_distinguished_name]
CN = ft_transcendance_CA
O = 42Mulhouse
C = FR

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOF

# Generate CA certificate with extensions
openssl req -x509 -new -nodes -key certs/ca/ca.key -sha256 -days 3650 \
  -out certs/ca/ca.crt -config certs/ca/ca.cnf -extensions v3_ca

# Function to generate certificates for each service
generate_service_cert() {
  local service=$1
  
  # Generate private key
  openssl genrsa -out "certs/services/$service/$service.key" 2048
  
  # Create config file for the service
  cat > "certs/services/$service/$service.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = $service
O = 42Mulhouse
C = FR

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $service
DNS.2 = localhost
EOF
  
  # Create certificate signing request (CSR) with extensions
  openssl req -new -key "certs/services/$service/$service.key" \
    -out "certs/services/$service/$service.csr" \
    -config "certs/services/$service/$service.cnf" \
    -extensions v3_req
  
  # Create a config file for signing
  cat > "certs/services/$service/signing.cnf" << EOF
[ca]
default_ca = CA_default

[CA_default]
copy_extensions = copy
policy = policy_match

[policy_match]
countryName = match
organizationName = match
commonName = supplied

[extensions]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $service
DNS.2 = localhost
EOF
  
  # Sign the CSR with our CA
  openssl x509 -req -in "certs/services/$service/$service.csr" \
    -CA certs/ca/ca.crt -CAkey certs/ca/ca.key -CAcreateserial \
    -out "certs/services/$service/$service.crt" -days 730 \
    -sha256 -extfile "certs/services/$service/signing.cnf" \
    -extensions extensions
  
  rm "certs/services/$service/$service.csr" "certs/services/$service/$service.cnf" "certs/services/$service/signing.cnf"
  
  chmod 644 "certs/services/$service/$service.crt"
  chmod 644 "certs/services/$service/$service.key"
}

# Generate certificates for all services
for service in auth chat gateway matchmaking nginx pong social users; do
  generate_service_cert "$service"
done

# openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
# openssl rsa -in private_key.pem -pubout -out public_key.pem