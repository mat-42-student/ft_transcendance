#!/usr/bin/env sh
set -e

python manage.py makemigrations authentication --noinput
python manage.py migrate --noinput

exec "$@"
