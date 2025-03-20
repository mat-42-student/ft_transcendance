#!/usr/bin/env sh

until python manage.py check --database default 2>/dev/null; do
  echo "Waiting for database connection..."
  sleep 2
done

mkdir  -p /shared_credentials
python ./manage.py collectstatic --noinput
python manage.py makemigrations authentication --no-input
python manage.py migrate --no-input
python manage.py create_oauth_client_app

exec "$@"
