path "auth/approle/role/nginx-service/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/nginx-service/secret-id" {
  capabilities = ["create", "update"]
}
