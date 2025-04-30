FROM hashicorp/vault:latest

RUN apk --no-cache add jq curl gpg gpg-agent netcat-openbsd openssl

RUN mkdir -p /vault/config /vault/file

COPY . /vault

ENTRYPOINT ["/vault/vault-init.sh"]