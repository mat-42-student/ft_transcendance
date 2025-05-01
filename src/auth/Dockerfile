FROM django-base

WORKDIR /app

COPY . .

RUN adduser -D appuser && \
    chown -R appuser:appuser /app

RUN chmod +x /app/entrypoint.sh

USER appuser

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "auth.wsgi:application"]



