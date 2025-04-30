path "auth/approle/role/matchmaking-service/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/matchmaking-service/secret-id" {
  capabilities = ["create", "update"]
}