FROM python:3.13.1-alpine3.21

WORKDIR /app

COPY users_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY media /media
RUN mkdir -p /media/avatars && \
    chmod 777 /media && \
    chmod 777 /media/avatars

COPY users_service/ .

RUN adduser -D appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /media

USER appuser

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "users_service.wsgi:application"]