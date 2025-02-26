#!/usr/bin/env sh

python ./manage.py makemigrations Selectmode --no-input

exec python ./manage.py listenredis
    
