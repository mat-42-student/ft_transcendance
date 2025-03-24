# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     mkdir -p /app/shared_credentials && \
#     chown -R appuser:appuser /app

# RUN chmod +x /app/entrypoint.sh

# USER appuser

# ENTRYPOINT ["./entrypoint.sh"]
# CMD ["python", "manage.py", "runsocialworker"]

FROM django-base

WORKDIR /app

# RUN mkdir -p /app/shared_credentials

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "manage.py", "runsocialworker"]