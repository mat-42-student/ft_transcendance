#!/usr/bin/env sh

exec uvicorn gateway.asgi:application --host 0.0.0.0 --port 8057 --reload