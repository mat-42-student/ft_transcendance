import json
import base64
import requests
import logging
import time
import os
from django.conf import settings

class VaultClient:
    """Client for interacting with Vault using existing AppRole token"""
    
    def __init__(self):
        self.vault_url = settings.VAULT_URL
        self.service_name = settings.SERVICE_NAME
        
        # Use the token from environment (set by entrypoint.sh)
        self.vault_token = os.environ.get('VAULT_TOKEN')
        self.headers = {'X-Vault-Token': self.vault_token}
        # Default token expiry (will be updated on first API call)
        self.token_expiry = time.time() + 3600
        logging.info(f"Using existing Vault token from environment for {self.service_name}")

        # Setup mTLS session during initialization
        self.setup_mtls_session()
    
    def _check_token(self):
        """Check if token is valid and get a new one if needed"""
        if time.time() > self.token_expiry:
            # Check token information
            try:
                response = requests.get(
                    f"{self.vault_url}/v1/auth/token/lookup-self",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    # Update token expiry based on remaining TTL
                    token_data = response.json()['data']
                    ttl = token_data.get('ttl', 3600)
                    # Set expiry to 80% of remaining TTL
                    self.token_expiry = time.time() + (ttl * 0.8)
                    logging.info(f"Token updated, new expiry in {ttl * 0.8:.0f} seconds")
                    return
                    
                # If token lookup fails, log the error but don't try bootstrap
                logging.error("Token invalid or expired, and no re-authentication method available")
                raise Exception("Vault token invalid or expired")
                    
            except Exception as e:
                logging.error(f"Error checking token: {str(e)}")
                raise Exception(f"Vault authentication failed: {str(e)}")

    def setup_mtls_session(self):
        """Setup an mTLS session using certificates from Vault"""
        try:
            # Request certificates from Vault
            cert_data = self.request_certificate()
            
            # Write certificates to temporary files
            cert_path = "/tmp/client.pem"
            key_path = "/tmp/client-key.pem"
            
            with open(cert_path, "w") as f:
                f.write(cert_data["certificate"])
            
            with open(key_path, "w") as f:
                f.write(cert_data["private_key"])
                
            # Create a session with the certificates
            self.session = requests.Session()
            self.session.cert = (cert_path, key_path)
            
            logging.info(f"mTLS session established for {self.service_name}")
            return self.session
            
        except Exception as e:
            logging.error(f"Failed to setup mTLS session: {str(e)}")
            raise
    
    def sign_jwt(self, key_name, payload):
        """Sign JWT payload using Vault Transit engine"""
        try:
            self._check_token()
            
            # Create JWT header
            header = {"alg": "RS256", "typ": "JWT"}
            
            # Encode header and payload to base64url format
            encoded_header = self._base64url_encode(json.dumps(header))
            encoded_payload = self._base64url_encode(json.dumps(payload))
            
            # Create signing input
            signing_input = f"{encoded_header}.{encoded_payload}"
            
            # Use Vault to sign the data
            sign_url = f"{self.vault_url}/v1/transit/sign/{key_name}/sha2-256"
            response = requests.post(
                sign_url,
                headers=self.headers,
                json={"input": self._base64_encode(signing_input)}
            )
            
            if response.status_code != 200:
                raise Exception(f"Vault signing failed: {response.text}")
                
            # Extract signature and remove vault prefix
            signature = response.json()['data']['signature']
            clean_signature = signature.split(':')[-1]
            
            # Construct complete JWT
            return f"{signing_input}.{clean_signature}"
        except Exception as e:
            logging.error(f"JWT signing failed: {str(e)}")
            raise
        
    def verify_jwt(self, key_name, token):
        """Verify JWT using Vault Transit engine"""
        try:
            self._check_token()
            
            # Split the JWT
            try:
                header_b64, payload_b64, signature = token.split('.')
            except ValueError:
                return None
                
            # Create signing input
            signing_input = f"{header_b64}.{payload_b64}"
            
            # Use Vault to verify the signature
            verify_url = f"{self.vault_url}/v1/transit/verify/{key_name}/sha2-256"
            response = requests.post(
                verify_url,
                headers=self.headers,
                json={
                    "input": self._base64_encode(signing_input),
                    "signature": f"vault:v1:{signature}"
                }
            )
            
            if response.status_code != 200:
                logging.error(f"Vault verification failed: {response.text}")
                return None
                
            # Check if signature is valid
            is_valid = response.json()['data']['valid']
            if is_valid:
                # Decode payload and return as dict
                try:
                    payload = json.loads(self._base64url_decode(payload_b64))
                    return payload
                except Exception:
                    return None
            return None
        except Exception as e:
            logging.error(f"JWT verification failed: {str(e)}")
            return None
            
    def get_jwt_config(self, config_path):
        """Get JWT configuration from KV store"""
        try:
            self._check_token()
            
            kv_url = f"{self.vault_url}/v1/kv/data/{config_path}"
            response = requests.get(kv_url, headers=self.headers)
            
            if response.status_code != 200:
                logging.error(f"Failed to get JWT config: {response.text}")
                raise Exception(f"Failed to get JWT config: {response.text}")
                
            return response.json()['data']['data']
        except Exception as e:
            logging.error(f"Failed to get JWT config: {str(e)}")
            raise

    def get_kv_secret(self, path):
        """Get a secret from Vault KV store"""
        try:
            self._check_token()
            
            kv_url = f"{self.vault_url}/v1/kv/data/{path}"
            response = requests.get(kv_url, headers=self.headers)
            
            if response.status_code != 200:
                logging.error(f"Failed to get secret: {response.text}")
                raise Exception(f"Failed to get secret: {response.text}")
            
            return response.json()['data']['data']
        except Exception as e:
            logging.error(f"Failed to get secret: {str(e)}")
            raise

    def request_certificate(self, common_name=None, ttl="720h"):
        """Request a certificate from Vault PKI secrets engine"""
        try:
            self._check_token()
            
            if common_name is None:
                common_name = f"{self.service_name}.local"
                
            # Get the hostname and IP
            hostname = os.popen('hostname').read().strip()
            
            # Get IPs in a way that works in Alpine containers
            try:
                # Try hostname -i first (works in most Alpine)
                ip_list = os.popen('hostname -i 2>/dev/null || ip -4 addr | grep -oP "(?<=inet\s)\d+(\.\d+){3}" | tr "\n" ","').read().strip()
            except:
                # Fallback to localhost if all else fails
                ip_list = "127.0.0.1"
            
            # Request certificate
            cert_url = f"{self.vault_url}/v1/pki/issue/services"
            cert_data = {
                "common_name": common_name,
                "alt_names": f"localhost,{hostname}",
                "ip_sans": f"127.0.0.1,{ip_list}",
                "ttl": ttl
            }
            
            response = requests.post(
                cert_url,
                headers=self.headers,
                json=cert_data
            )
            
            if response.status_code != 200:
                logging.error(f"Failed to request certificate: {response.text}")
                raise Exception(f"Failed to request certificate: {response.text}")
                
            return response.json()['data']
        except Exception as e:
            logging.error(f"Certificate request failed: {str(e)}")
            raise
        
    def _base64url_encode(self, data):
        """Encode data to base64url format"""
        if isinstance(data, str):
            data = data.encode('utf-8')
        encoded = base64.urlsafe_b64encode(data).rstrip(b'=')
        return encoded.decode('utf-8')
        
    def _base64url_decode(self, data):
        """Decode base64url data"""
        padding = '=' * (4 - (len(data) % 4))
        return base64.urlsafe_b64decode(data + padding).decode('utf-8')
        
    def _base64_encode(self, data):
        """Standard base64 encoding for Vault API"""
        if isinstance(data, str):
            data = data.encode('utf-8')
        return base64.b64encode(data).decode('utf-8')