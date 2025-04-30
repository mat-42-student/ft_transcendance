# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     chown -R appuser:appuser /app

# USER appuser

# CMD ["uvicorn", "gateway.asgi:application", "--host", "0.0.0.0", "--port", "8057"]

FROM django-base

RUN apk add --no-cache curl jq

WORKDIR /app

COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "gateway.asgi:application", "--host", "0.0.0.0", "--port", "8057", "--reload"]