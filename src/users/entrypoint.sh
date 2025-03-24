#!/usr/bin/env sh

# SHARED_ENV="/app/shared_credentials/.env"
# TIMEOUT=60  # Temps maximum en secondes
# TIMER=0

# echo "Waiting for $SHARED_ENV..."

# while [ ! -f "$SHARED_ENV" ]; do
#   sleep 2
#   TIMER=$((TIMER+2))
#   if [ "$TIMER" -ge "$TIMEOUT" ]; then
#     echo "Error: Timeout while waiting for $SHARED_ENV. Exiting..."
#     exit 1
#   fi
# done

# echo "Loading environment variables from $SHARED_ENV"
# export $(grep -v '^#' "$SHARED_ENV" | xargs)

# ✅ Appliquer les migrations avant gunicorn
echo "Applying database migrations..."
python manage.py makemigrations accounts --no-input
python manage.py migrate --no-input

# Lancer gunicorn
exec "$@"
