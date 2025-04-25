# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     chown -R appuser:appuser /app

# USER appuser

# CMD ["python", "manage.py", "runchatworker"]

FROM django-base

RUN apk add --no-cache curl

RUN curl -O https://releases.hashicorp.com/vault/1.17.0/vault_1.17.0_linux_amd64.zip && \
    unzip vault_1.17.0_linux_amd64.zip && \
    mv vault /usr/local/bin/ && \
    rm vault_1.17.0_linux_amd64.zip && \
    chmod +x /usr/local/bin/vault

WORKDIR /app

COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "manage.py", "runchatworker"]