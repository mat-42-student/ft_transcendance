#!/usr/bin/env sh

python ./manage.py collectstatic
python ./manage.py makemigrations authentication --no-input
python ./manage.py migrate --no-input
# python scripts/create_oauth_client.py

exec gunicorn --reload --bind 0.0.0.0:8000 auth_service.wsgi:application