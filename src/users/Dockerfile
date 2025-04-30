# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     chown -R appuser:appuser /app

# RUN chmod +x /app/entrypoint.sh

# USER appuser

# ENTRYPOINT ["/app/entrypoint.sh"]
# CMD ["gunicorn", "--bind", "0.0.0.0:8000", "users.wsgi:application"]

FROM django-base

RUN apk add --no-cache curl jq

WORKDIR /app

COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "--reload", "--bind", "0.0.0.0:8000", "users.wsgi:application"]