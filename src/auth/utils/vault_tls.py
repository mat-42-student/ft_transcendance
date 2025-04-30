import os
import requests
import logging
import datetime
import socket
import subprocess
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

class VaultTLSClient:
    """Client for managing mTLS certificates with Vault PKI"""
    
    def __init__(self, vault_client):
        self.vault_client = vault_client
        self.cert_path = "/app/certs"
        self.service_name = os.environ.get("SERVICE_NAME", "unknown")
        self.cert_file = f"{self.cert_path}/{self.service_name}.crt"
        self.key_file = f"{self.cert_path}/{self.service_name}.key"
        self.ca_file = f"{self.cert_path}/ca.crt"
        
        # Ensure cert directory exists
        os.makedirs(self.cert_path, exist_ok=True)
        
        # Initialize certificates
        self.ensure_valid_certificates()
        
    def ensure_valid_certificates(self):
        """Check if certificates exist and are valid, otherwise generate new ones"""
        needs_new_certs = True
        
        # Check if certificate files exist
        if os.path.exists(self.cert_file) and os.path.exists(self.key_file):
            # Check certificate expiration
            try:
                with open(self.cert_file, 'rb') as f:
                    cert_data = f.read()
                    cert = x509.load_pem_x509_certificate(cert_data, default_backend())
                    
                # Check if cert is still valid with 1 day buffer
                expiration = cert.not_valid_after
                if expiration > datetime.datetime.now() + datetime.timedelta(days=1):
                    needs_new_certs = False
            except Exception as e:
                logging.warning(f"Error checking certificate validity: {str(e)}")
        
        # Generate new certificates if needed
        if needs_new_certs:
            self.generate_certificates()
        
        # Always ensure we have CA cert
        self.ensure_ca_cert()
    
    def get_ip_addresses(self):
        """Get IP addresses in a way that works in Alpine and other containers"""
        try:
            # Try to get IPs using various methods that work across different environments
            hostname = socket.gethostname()
            
            # Try different approaches to get IP addresses
            ip_list = []
            
            # Method 1: socket.gethostbyname
            try:
                ip = socket.gethostbyname(hostname)
                if ip and ip != '127.0.0.1':
                    ip_list.append(ip)
            except:
                pass
                
            # Method 2: hostname -i (common in Alpine)
            try:
                hostname_i = subprocess.check_output(["hostname", "-i"], universal_newlines=True).strip()
                if hostname_i and hostname_i != '127.0.0.1':
                    for ip in hostname_i.split():
                        if ip not in ip_list:
                            ip_list.append(ip)
            except:
                pass
                
            # Method 3: ip command (more universal)
            try:
                ip_cmd = subprocess.check_output(
                    "ip -4 addr | grep -oP '(?<=inet\\s)\\d+(\.\\d+){3}'", 
                    shell=True, 
                    universal_newlines=True
                ).strip()
                
                for ip in ip_cmd.split('\n'):
                    if ip and ip != '127.0.0.1' and ip not in ip_list:
                        ip_list.append(ip)
            except:
                pass
                
            # Always include localhost
            if '127.0.0.1' not in ip_list:
                ip_list.append('127.0.0.1')
                
            return ','.join(ip_list)
        except Exception as e:
            logging.warning(f"Error getting IP addresses: {str(e)}")
            return "127.0.0.1"  # Fallback to localhost
    
    def generate_certificates(self):
        """Generate new certificates using Vault PKI"""
        try:
            # Get hostname and IP addresses
            hostname = socket.gethostname()
            ip_sans = self.get_ip_addresses()
            
            logging.info(f"Generating certificate for {self.service_name} with hostname {hostname} and IPs: {ip_sans}")
            
            # Use the vault_client's request_certificate method
            try:
                cert_data = self.vault_client.request_certificate(
                    common_name=f"{self.service_name}.service.internal",
                    ttl="720h"  # 30 days
                )
                
                # Write certificate and private key to files
                with open(self.cert_file, 'w') as f:
                    f.write(cert_data['certificate'])
                
                with open(self.key_file, 'w') as f:
                    f.write(cert_data['private_key'])
                    
                # Write issuing CA to separate file
                with open(f"{self.cert_path}/issuing_ca.crt", 'w') as f:
                    f.write(cert_data['issuing_ca'])
                    
                # If we have a CA chain, write it as well
                if 'ca_chain' in cert_data:
                    with open(f"{self.cert_path}/ca_chain.crt", 'w') as f:
                        for cert in cert_data['ca_chain']:
                            f.write(cert + "\n")
                
                os.chmod(self.key_file, 0o600)  # Secure permissions for private key
                
                logging.info(f"Generated new mTLS certificates for {self.service_name}")
                
            except Exception as e:
                logging.error(f"Error using vault_client.request_certificate: {str(e)}")
                
                # Fallback to direct HTTP request if the method doesn't exist
                headers = self.vault_client.headers
                
                cert_response = requests.post(
                    f"{self.vault_client.vault_url}/v1/pki/issue/services",
                    headers=headers,
                    json={
                        "common_name": f"{self.service_name}.service.internal",
                        "alt_names": f"localhost,{hostname}",
                        "ip_sans": ip_sans,
                        "ttl": "720h"  # 30 days
                    }
                )
                
                if cert_response.status_code != 200:
                    raise Exception(f"Failed to get certificate: {cert_response.text}")
                
                cert_data = cert_response.json()['data']
                
                # Write certificate and private key to files
                with open(self.cert_file, 'w') as f:
                    f.write(cert_data['certificate'])
                
                with open(self.key_file, 'w') as f:
                    f.write(cert_data['private_key'])
                
                os.chmod(self.key_file, 0o600)  # Secure permissions for private key
                
                logging.info(f"Generated new mTLS certificates for {self.service_name} using fallback method")
            
        except Exception as e:
            logging.error(f"Certificate generation error: {str(e)}")
            raise
    
    def ensure_ca_cert(self):
        """Ensure CA certificate is available"""
        if not os.path.exists(self.ca_file):
            try:
                # First try to use the vault_file path
                vault_file_ca = "/vault/file/ca.crt"
                if os.path.exists(vault_file_ca):
                    logging.info(f"Copying CA certificate from {vault_file_ca}")
                    with open(vault_file_ca, 'rb') as src:
                        with open(self.ca_file, 'wb') as dest:
                            dest.write(src.read())
                else:
                    # Request CA certificate from Vault
                    if hasattr(self.vault_client, 'headers') and self.vault_client.headers:
                        ca_response = requests.get(
                            f"{self.vault_client.vault_url}/v1/pki/ca/pem",
                            headers=self.vault_client.headers
                        )
                    else:
                        ca_response = requests.get(
                            f"{self.vault_client.vault_url}/v1/pki/ca/pem"
                        )
                    
                    if ca_response.status_code != 200:
                        raise Exception(f"Failed to get CA certificate: {ca_response.status_code}")
                    
                    # Write CA certificate to file
                    with open(self.ca_file, 'w') as f:
                        f.write(ca_response.text)
                        
                    logging.info("Retrieved CA certificate from Vault API")
                    
            except Exception as e:
                logging.error(f"CA certificate retrieval error: {str(e)}")
                raise
                
    def get_cert_paths(self):
        """Return paths to certificate files for use with requests"""
        return {
            'cert': (self.cert_file, self.key_file),
            'verify': self.ca_file
        }