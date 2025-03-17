# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     chown -R appuser:appuser /app

# USER appuser

# ENTRYPOINT ["uvicorn", "pong.asgi:application", "--host", "0.0.0.0", "--port", "8006"]

FROM django-base

WORKDIR /app

ENTRYPOINT ["uvicorn", "pong.asgi:application", "--host", "0.0.0.0", "--port", "8006", "--reload"]
