FROM python:3.13.1-alpine3.21

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser -D appuser && \
    chown -R appuser:appuser /app

USER appuser

CMD ["uvicorn", "gateway_service.asgi:application", "--host", "0.0.0.0", "--port", "8057"]
