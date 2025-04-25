# Allow services to request database credentials
path "database/creds/{{identity.entity.metadata.service}}" {
  capabilities = ["read"]
}

# Allow services to renew their database leases
path "sys/leases/renew" {
  capabilities = ["update"]
}