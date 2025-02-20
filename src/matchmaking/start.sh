#!/usr/bin/env sh

#exec gunicorn --bind 0.0.0.0:8000 api.wsgi:application #server de production on le remplacera par daphne
python ./manage.py makemigrations Selectmode --no-input
python ./manage.py migrate Selectmode --no-input
exec python ./manage.py listenredis
#exec daphne -b 0.0.0.0 -p 8000 matchmaking.asgi:application