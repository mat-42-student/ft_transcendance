path "auth/approle/role/users-service/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/users-service/secret-id" {
  capabilities = ["create", "update"]
}

