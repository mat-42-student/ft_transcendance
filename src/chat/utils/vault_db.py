import logging
import time
import threading
import requests
from django.conf import settings
from django.db import connections

class VaultDBManager:
    """Manager for dynamic database credentials from Vault"""
    
    def __init__(self, vault_client):
        self.vault_client = vault_client
        self.service_name = settings.SERVICE_NAME
        self.lease_id = None
        self.lease_duration = 0
        self.renewal_time = 0
        self.lock = threading.Lock()
        self.renewal_thread = None
        self.running = False
        
        # Initialize database credentials
        self.get_db_credentials()
        
    def get_db_credentials(self):
        """Fetch database credentials from Vault"""
        with self.lock:
            try:
                # Check token validity
                self.vault_client._check_token()
                
                # Get DB credentials for the service
                # Use the mTLS session if available
                if hasattr(self.vault_client, 'session') and self.vault_client.session:
                    response = self.vault_client.session.get(
                        f"{self.vault_client.vault_url}/v1/database/creds/{self.service_name}",
                        headers=self.vault_client.headers
                    )
                else:
                    response = requests.get(
                        f"{self.vault_client.vault_url}/v1/database/creds/{self.service_name}",
                        headers=self.vault_client.headers
                    )
                
                if response.status_code != 200:
                    if response.status_code == 403:
                        # Try re-authenticating
                        self.vault_client._authenticate()
                        return self.get_db_credentials()
                    raise Exception(f"Failed to get DB credentials: {response.text}")
                
                credential_data = response.json()
                
                # Store lease information
                self.lease_id = credential_data['lease_id']
                self.lease_duration = credential_data['lease_duration']
                
                # Set renewal time to 70% of lease duration
                self.renewal_time = time.time() + (self.lease_duration * 0.7)
                
                # Extract credentials
                username = credential_data['data']['username']
                password = credential_data['data']['password']
                
                # Update Django's database connection settings
                self._update_db_settings(username, password)
                
                # Start the renewal thread if not already running
                self.start_renewal_thread()
                
                logging.info(f"Obtained database credentials for {self.service_name}")
                return username, password
                
            except Exception as e:
                logging.error(f"Error getting database credentials: {str(e)}")
                raise
    
    def _update_db_settings(self, username, password):
        """Update Django's database connection settings"""
        # Close existing connections
        connections.close_all()
        
        # Update the settings
        settings.DATABASES['default']['USER'] = username
        settings.DATABASES['default']['PASSWORD'] = password
        
        logging.info("Updated database connection settings")
    
    def revoke_lease(self):
        """Revoke the current database credential lease"""
        if not self.lease_id:
            return False
            
        try:
            logging.info(f"Revoking lease {self.lease_id}")
            
            # Use the mTLS session if available
            if hasattr(self.vault_client, 'session') and self.vault_client.session:
                response = self.vault_client.session.put(
                    f"{self.vault_client.vault_url}/v1/sys/leases/revoke",
                    headers=self.vault_client.headers,
                    json={"lease_id": self.lease_id}
                )
            else:
                response = requests.put(
                    f"{self.vault_client.vault_url}/v1/sys/leases/revoke",
                    headers=self.vault_client.headers,
                    json={"lease_id": self.lease_id}
                )
            
            if response.status_code == 204 or response.status_code == 200:
                self.lease_id = None
                logging.info("Successfully revoked database credential lease")
                return True
            else:
                logging.warning(f"Lease revocation returned status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            logging.error(f"Error revoking lease: {str(e)}")
            return False
    
    def renew_lease(self):
        """Renew the lease for database credentials"""
        with self.lock:
            if not self.lease_id:
                return False
                
            try:
                # Check token validity
                self.vault_client._check_token()
                
                # Renew the lease
                # Use the mTLS session if available
                if hasattr(self.vault_client, 'session') and self.vault_client.session:
                    response = self.vault_client.session.post(
                        f"{self.vault_client.vault_url}/v1/sys/leases/renew",
                        headers=self.vault_client.headers,
                        json={"lease_id": self.lease_id}
                    )
                else:
                    response = requests.post(
                        f"{self.vault_client.vault_url}/v1/sys/leases/renew",
                        headers=self.vault_client.headers,
                        json={"lease_id": self.lease_id}
                    )
                
                if response.status_code != 200:
                    if response.status_code == 400 and "lease not found or already expired" in response.text:
                        # Lease expired, get new credentials
                        logging.info("Lease expired or not found, obtaining new credentials")
                        self.get_db_credentials()
                        return True
                    
                    if response.status_code == 403:
                        # Try re-authenticating
                        logging.info("Permission denied renewing lease, re-authenticating")
                        self.vault_client._authenticate()
                        return self.renew_lease()
                        
                    logging.error(f"Lease renewal failed: {response.text}")
                    return False
                
                # Update lease information
                renewal_data = response.json()
                self.lease_id = renewal_data['lease_id']
                self.lease_duration = renewal_data['lease_duration']
                
                # Set new renewal time
                self.renewal_time = time.time() + (self.lease_duration * 0.7)
                
                logging.info(f"Successfully renewed database credential lease")
                return True
                
            except Exception as e:
                logging.error(f"Error renewing lease: {str(e)}")
                return False
    
    def _renewal_worker(self):
        """Worker thread to periodically renew the lease"""
        while self.running:
            try:
                # Check if it's time to renew
                if time.time() > self.renewal_time:
                    self.renew_lease()
                
                # Sleep for a bit
                time.sleep(30)
                
            except Exception as e:
                logging.error(f"Error in renewal worker: {str(e)}")
                time.sleep(30)
    
    def start_renewal_thread(self):
        """Start the lease renewal thread if not already running"""
        if self.renewal_thread is None or not self.renewal_thread.is_alive():
            self.running = True
            self.renewal_thread = threading.Thread(target=self._renewal_worker, daemon=True)
            self.renewal_thread.start()
            logging.info("Started database credential renewal thread")
    
    def stop_renewal_thread(self):
        """Stop the lease renewal thread"""
        self.running = False
        if self.renewal_thread:
            self.renewal_thread.join(timeout=1)
            self.renewal_thread = None
            logging.info("Stopped database credential renewal thread")
            
    def cleanup(self):
        """Cleanup resources when shutting down"""
        # Stop the renewal thread
        self.stop_renewal_thread()
        
        # Revoke the lease to avoid orphaned credentials
        if self.lease_id:
            self.revoke_lease()