path "pki*" {
     capabilities = ["read", "list"]
}

path "pki/sign/services" { 
    capabilities = ["create", "update"]
}

path "pki/issue/services" { 
    capabilities = ["create"]
}