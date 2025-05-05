FROM nginx:alpine

RUN addgroup -S nginxgroup && adduser -S nginxuser -G nginxgroup && \
    mkdir -p /etc/nginx/ssl

COPY certs/services/nginx/nginx.crt /etc/nginx/ssl/nginx.crt
COPY certs/services/nginx/nginx.key /etc/nginx/ssl/nginx.key
COPY frontend/ /usr/share/nginx/frontend
COPY ./media/ /media

RUN chown -R nginxuser:nginxgroup /etc/nginx/ssl /var/log/nginx /var/cache/nginx && \
    chmod 644 /etc/nginx/ssl/nginx.crt && \
    chmod 640 /etc/nginx/ssl/nginx.key

COPY nginx/nginx.conf /etc/nginx/nginx.conf

USER nginxuser

CMD ["nginx", "-g", "daemon off;"]
