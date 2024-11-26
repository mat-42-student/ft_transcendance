python ./manage.py makemigrations
python ./manage.py migrate
# exec python ./manage.py runserver 0.0.0.0:8000
exec uvicorn gateway.asgi:application --host 0.0.0.0 --port 8057
# exec daphne -b 0.0.0.0 -p 8006 _Pong.asgi:application