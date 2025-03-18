# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     chown -R appuser:appuser /app

# USER appuser

# ENTRYPOINT ["uvicorn", "gateway.asgi:application", "--host", "0.0.0.0", "--port", "8057"]

FROM django-base

WORKDIR /app

ENTRYPOINT ["uvicorn", "gateway.asgi:application", "--host", "0.0.0.0", "--port", "8057", "--reload"]