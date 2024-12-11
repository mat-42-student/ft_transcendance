#!/usr/bin/env sh

python ./manage.py makemigrations accounts --no-input
python ./manage.py migrate --no-input
exec gunicorn --reload --bind 0.0.0.0:8000 users.wsgi:application
#exec daphne -b 0.0.0.0 -p 8000 users_management.asgi:application

