# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     chown -R appuser:appuser /app

# USER appuser

# CMD ["python", "manage.py", "runsocialworker"]

FROM django-base

RUN apk add --no-cache curl

WORKDIR /app

COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "manage.py", "runsocialworker"]