FROM django-base

WORKDIR /app

COPY . .

RUN adduser -D appuser && \
    chown -R appuser:appuser /app

USER appuser

CMD ["uvicorn", "pong.asgi:application", "--host", "0.0.0.0", "--port", "8006"]

