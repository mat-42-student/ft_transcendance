#!/usr/bin/env sh

# Path to the shared .env file
# SHARED_ENV="/app/shared_credentials/.env"

# Wait for the .env file to exist
# echo "Waiting for $SHARED_ENV..."
# while [ ! -f "$SHARED_ENV" ]; do
#   sleep 2
# done

# Load environment variables
# echo "Loading environment variables from $SHARED_ENV"
# export $(grep -v '^#' "$SHARED_ENV" | xargs)

exec "$@"