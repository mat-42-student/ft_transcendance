#!/usr/bin/env sh

mkdir  -p /shared_credentials
python ./manage.py collectstatic
python ./manage.py makemigrations authentication --no-input
python ./manage.py migrate --no-input
python ./manage.py create_oauth_client_app

exec gunicorn --reload --bind 0.0.0.0:8000 auth_service.wsgi:application