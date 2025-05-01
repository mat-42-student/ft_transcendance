FROM django-base

WORKDIR /app

COPY . .

RUN adduser -D appuser && \
    chown -R appuser:appuser /app

RUN chmod +x /app/entrypoint.sh

USER appuser

CMD ["python", "manage.py", "listenredis"]
