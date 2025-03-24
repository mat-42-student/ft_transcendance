# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     mkdir -p /app/shared_credentials && \  
#     chown -R appuser:appuser /app

# RUN chmod +x /app/entrypoint.sh

# USER appuser

# ENTRYPOINT ["/app/entrypoint.sh"]
# CMD ["gunicorn", "--bind", "0.0.0.0:8000", "users.wsgi:application"]

FROM django-base

WORKDIR /app

# RUN mkdir -p /app/shared_credentials

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "--reload", "--bind", "0.0.0.0:8000", "users.wsgi:application"]