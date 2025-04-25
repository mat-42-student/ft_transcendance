path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "kv/data/nginx-service/creds" {
  capabilities = ["read"]
}

path "sys/internal/ui/mounts/kv/" {
  capabilities = ["read"]
}

path "sys/internal/ui/mounts/kv/data/nginx-service/creds" {
  capabilities = ["read"]
}

path "kv/nginx-service/creds" {
  capabilities = ["read"]
}

path "sys/internal/ui/mounts/*" {
  capabilities = ["read"]
}