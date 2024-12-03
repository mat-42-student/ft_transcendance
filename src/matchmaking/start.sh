#!/usr/bin/env bash

#/code/wait-for-it.sh postgres:5432 --timeout=60s -- python ./manage.py makemigrations --no-input
#/code/wait-for-it.sh postgres:5432 --timeout=60s -- python ./manage.py migrate --no-input
#/code/wait-for-it.sh postgres:5432 --timeout=60s -- exec python ./manage.py runserver 0.0.0.0:8000
#exec gunicorn --bind 0.0.0.0:8000 api.wsgi:application #server de production on le remplacera par daphne
python ./manage.py makemigrations Selectmode --no-input
python ./manage.py migrate Selectmode --no-input
exec daphne -b 0.0.0.0 -p 8000 matchmaking.asgi:application