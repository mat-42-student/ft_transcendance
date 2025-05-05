FROM python:3.13.1-alpine3.21

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser -D appuser && \
    chown -R appuser:appuser /app

USER appuser

CMD ["python", "manage.py", "runsocialworker"]
