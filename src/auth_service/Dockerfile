FROM python:3.13.1-alpine3.21

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser -D appuser && \
    chown -R appuser:appuser /app

RUN chmod +x /app/entrypoint.sh

USER appuser

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "auth_service.wsgi:application"]



