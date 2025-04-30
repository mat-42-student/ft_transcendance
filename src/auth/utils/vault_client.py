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
        if not self.vault_token:
            # Fallback to bootstrap token method if no token in environment
            self._authenticate_with_bootstrap()
        else:
            self.headers = {'X-Vault-Token': self.vault_token}
            # Default token expiry (will be updated on first API call)
            self.token_expiry = time.time() + 3600
            logging.info(f"Using existing Vault token from environment for {self.service_name}")
            
    def _authenticate_with_bootstrap(self):
        """Authenticate to Vault using bootstrap token if needed (fallback method)"""
        try:
            bootstrap_token_path = f"/vault/file/{self.service_name}-bootstrap-token.txt"
            
            # Read bootstrap token from file
            if os.path.exists(bootstrap_token_path):
                with open(bootstrap_token_path, 'r') as f:
                    bootstrap_token = f.read().strip()
            else:
                logging.error(f"Bootstrap token file not found at {bootstrap_token_path}")
                raise FileNotFoundError(f"Bootstrap token file not found at {bootstrap_token_path}")
                
            bootstrap_headers = {'X-Vault-Token': bootstrap_token}
            
            # Get role_id directly from Vault using bootstrap token
            role_id_url = f"{self.vault_url}/v1/auth/approle/role/{self.service_name}-service/role-id"
            role_response = requests.get(
                role_id_url,
                headers=bootstrap_headers
            )
            
            if role_response.status_code != 200:
                logging.error(f"Failed to get role_id: {role_response.text}")
                raise Exception(f"Failed to get role_id: {role_response.status_code}")
                
            role_id = role_response.json()['data']['role_id']
            
            # Generate a new secret_id using bootstrap token
            secret_id_url = f"{self.vault_url}/v1/auth/approle/role/{self.service_name}-service/secret-id"
            secret_response = requests.post(
                secret_id_url,
                headers=bootstrap_headers
            )
            
            if secret_response.status_code != 200:
                logging.error(f"Failed to generate secret_id: {secret_response.text}")
                raise Exception(f"Failed to generate secret_id: {secret_response.status_code}")
                
            secret_id = secret_response.json()['data']['secret_id']
            
            # Authenticate with AppRole to get service token
            auth_data = {
                'role_id': role_id,
                'secret_id': secret_id
            }
            
            auth_response = requests.post(
                f"{self.vault_url}/v1/auth/approle/login",
                json=auth_data
            )
            
            if auth_response.status_code != 200:
                logging.error(f"AppRole authentication failed: {auth_response.text}")
                raise Exception(f"AppRole authentication failed: {auth_response.status_code}")
                
            # Get token and set expiry time (80% of TTL to renew before expiry)
            auth_data = auth_response.json()['auth']
            self.vault_token = auth_data['client_token']
            ttl_seconds = auth_data['lease_duration']
            self.token_expiry = time.time() + (ttl_seconds * 0.8)
            
            # Set the headers for future API calls
            self.headers = {'X-Vault-Token': self.vault_token}
            
            logging.info(f"Successfully authenticated to Vault using bootstrap token for {self.service_name}")
            
        except Exception as e:
            logging.error(f"Vault authentication error: {str(e)}")
            raise
    
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
                    
                # If token lookup fails, we need to re-authenticate
                logging.warning("Token invalid or expired, re-authenticating")
                self._authenticate_with_bootstrap()
                    
            except Exception as e:
                logging.error(f"Error checking token: {str(e)}")
                self._authenticate_with_bootstrap()
    
    def sign_jwt(self, key_name, payload):
        """Sign JWT payload using Vault Transit engine"""
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
            if response.status_code == 403:
                # Try re-authenticating on permission errors
                self._authenticate_with_bootstrap()
                return self.sign_jwt(key_name, payload)
            raise Exception(f"Vault signing failed: {response.text}")
            
        # Extract signature and remove vault prefix
        signature = response.json()['data']['signature']
        clean_signature = signature.split(':')[-1]
        
        # Construct complete JWT
        return f"{signing_input}.{clean_signature}"
        
    def verify_jwt(self, key_name, token):
        """Verify JWT using Vault Transit engine"""
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
            if response.status_code == 403:
                # Try re-authenticating on permission errors
                self._authenticate_with_bootstrap()
                return self.verify_jwt(key_name, token)
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
        
    def get_jwt_config(self, config_path):
        """Get JWT configuration from KV store"""
        self._check_token()
        
        kv_url = f"{self.vault_url}/v1/kv/data/{config_path}"
        response = requests.get(kv_url, headers=self.headers)
        
        if response.status_code != 200:
            if response.status_code == 403:
                # Try re-authenticating on permission errors
                self._authenticate_with_bootstrap()
                return self.get_jwt_config(config_path)
            raise Exception(f"Failed to get JWT config: {response.text}")
            
        return response.json()['data']['data']
    
    def get_kv_secret(self, path):
        """Get a secret from Vault KV store"""
        self._check_token()
        
        kv_url = f"{self.vault_url}/v1/kv/data/{path}"
        response = requests.get(kv_url, headers=self.headers)
        
        if response.status_code != 200:
            if response.status_code == 403:
                # Try re-authenticating on permission errors
                self._authenticate_with_bootstrap()
                return self.get_kv_secret(path)
            raise Exception(f"Failed to get secret: {response.text}")
        
        return response.json()['data']['data']
    
    def request_certificate(self, common_name=None, ttl="720h"):
        """Request a certificate from Vault PKI secrets engine"""
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
            if response.status_code == 403:
                # Try re-authenticating on permission errors
                self._authenticate_with_bootstrap()
                return self.request_certificate(common_name, ttl)
            raise Exception(f"Failed to request certificate: {response.text}")
            
        return response.json()['data']
        
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