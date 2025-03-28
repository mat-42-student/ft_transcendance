#!/usr/bin/env sh
set -e  # Exit immediately if any command fails

# Run Django setup commands
python manage.py makemigrations Selectmode --no-input
python manage.py migrate --noinput

exec "$@"

    
