FROM django-base

WORKDIR /app

COPY . .

RUN adduser -D appuser && \
    chown -R appuser:appuser /app

USER appuser

CMD ["python", "manage.py", "runsocialworker"]
