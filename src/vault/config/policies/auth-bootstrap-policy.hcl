path "auth/approle/role/auth-service/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/auth-service/secret-id" {
  capabilities = ["create", "update"]
}