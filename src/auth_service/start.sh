python ./manage.py makemigrations authentication --no-input
python ./manage.py migrate --no-input
exec gunicorn --reload --bind 0.0.0.0:8000 auth_service.wsgi:application
#!/usr/bin/env bash

# /code/wait-for-it.sh postgres:5432 --timeout=60s -- python ./manage.py makemigrations authentication --no-input
# /code/wait-for-it.sh postgres:5432 --timeout=60s -- python ./manage.py migrate --no-input

# exec gunicorn --reload --bind 0.0.0.0:8000 auth_service.wsgi:application
