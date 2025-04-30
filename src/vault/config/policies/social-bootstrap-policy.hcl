path "auth/approle/role/social-service/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/social-service/secret-id" {
  capabilities = ["create", "update"]
}

