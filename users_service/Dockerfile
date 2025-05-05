FROM python:3.13.1-alpine3.21

WORKDIR /app

# Copy requirements from the correct path
COPY users_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy media files
COPY media /media
RUN mkdir -p /media/avatars && \
    chmod 777 /media && \
    chmod 777 /media/avatars

# Copy the users service code
COPY users_service/ .

# Create user and set permissions
RUN adduser -D appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /media

USER appuser

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "users_service.wsgi:application"]