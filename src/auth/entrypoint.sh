#!/usr/bin/env sh
set -e  # Exit immediately if any command fails

# Run Django setup commands
python manage.py collectstatic --noinput
python manage.py makemigrations authentication --noinput
python manage.py migrate --noinput

exec "$@"
