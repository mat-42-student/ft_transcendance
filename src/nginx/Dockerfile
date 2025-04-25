FROM nginx:alpine

RUN apk add --no-cache curl

RUN curl -O https://releases.hashicorp.com/vault/1.17.0/vault_1.17.0_linux_amd64.zip && \
    unzip vault_1.17.0_linux_amd64.zip && \
    mv vault /usr/local/bin/ && \
    rm vault_1.17.0_linux_amd64.zip && \
    chmod +x /usr/local/bin/vault

# RUN addgroup -S nginxgroup && adduser -S nginxuser -G nginxgroup && \
#     mkdir -p /etc/nginx/ssl

# COPY certs/services/nginx/nginx.crt /etc/nginx/ssl/nginx.crt
# COPY certs/services/nginx/nginx.key /etc/nginx/ssl/nginx.key

# RUN chown -R nginxuser:nginxgroup /etc/nginx/ssl /var/log/nginx /var/cache/nginx && \
#     chmod 644 /etc/nginx/ssl/nginx.crt && \
#     chmod 640 /etc/nginx/ssl/nginx.key

COPY /nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh

# USER nginxuser

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
