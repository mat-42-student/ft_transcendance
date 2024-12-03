#!/usr/bin/env bash

/code/wait-for-it.sh postgres:5432 --timeout=60s -- python ./manage.py makemigrations --no-input
/code/wait-for-it.sh postgres:5432 --timeout=60s -- python ./manage.py migrate --no-input

# exec python ./manage.py runserver 0.0.0.0:8000
exec uvicorn gateway.asgi:application --host 0.0.0.0 --port 8057
# exec daphne -b 0.0.0.0 -p 8006 _Pong.asgi:application