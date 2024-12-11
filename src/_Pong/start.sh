#!/usr/bin/env sh

exec uvicorn _Pong.asgi:application --host 0.0.0.0 --port 8006