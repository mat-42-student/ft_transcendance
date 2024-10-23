# python ./manage.py makemigrations --no-input
python ./manage.py migrate --no-input
exec uvicorn _Pong.asgi:application --host 0.0.0.0 --port 8006
# exec daphne -b 0.0.0.0 -p 8006 _Pong.asgi:application