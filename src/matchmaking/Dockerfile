# FROM django-base

# WORKDIR /app

# COPY . .

# RUN adduser -D appuser && \
#     chown -R appuser:appuser /app

# RUN chmod +x /app/entrypoint.sh

# USER appuser

# ENTRYPOINT ["./entrypoint.sh"]
# CMD ["python", "manage.py", "listenredis"]

FROM django-base

WORKDIR /app

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "manage.py", "listenredis"]