python ./manage.py makemigrations game
python ./manage.py migrate
exec uvicorn _Pong.asgi:application --host 0.0.0.0 --port 8006
# exec daphne -b 0.0.0.0 -p 8006 _Pong.asgi:application