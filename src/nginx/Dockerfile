FROM nginx:alpine

RUN addgroup -S nginxgroup && adduser -S nginxuser -G nginxgroup && \
    apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -out /etc/nginx/ssl/ft_tr.crt \
        -keyout /etc/nginx/ssl/ft_tr.key \
        -subj "/C=FR/CN=localhost" \
        -addext "subjectAltName=DNS:*.42mulhouse.fr,DNS:localhost,DNS:127.0.0.1" && \
    chown -R nginxuser:nginxgroup /etc/nginx/ssl /var/log/nginx /var/cache/nginx && \
    chmod 640 /etc/nginx/ssl/ft_tr.key

COPY nginx.conf /etc/nginx/nginx.conf

USER nginxuser

CMD ["nginx", "-g", "daemon off;"]
