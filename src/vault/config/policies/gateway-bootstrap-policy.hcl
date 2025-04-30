path "auth/approle/role/gateway-service/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/gateway-service/secret-id" {
  capabilities = ["create", "update"]
}