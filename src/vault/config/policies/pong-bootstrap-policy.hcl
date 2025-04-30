path "auth/approle/role/pong-service/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/pong-service/secret-id" {
  capabilities = ["create", "update"]
}

