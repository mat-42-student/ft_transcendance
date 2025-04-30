path "auth/approle/role/chat-service/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/chat-service/secret-id" {
  capabilities = ["create", "update"]
}