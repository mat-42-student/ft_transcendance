python ./manage.py makemigrations --no-input
python ./manage.py migrate --no-input
#exec python ./manage.py runserver 0.0.0.0:8000
#gunicorn --bind 0.0.0.0:8000 api.wsgi:application #server de production on le remplacera par daphne
exec daphne -b 0.0.0.0 -p 8000 matchmaking.asgi:application