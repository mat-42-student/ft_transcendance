python ./manage.py makemigrations --no-input
python ./manage.py migrate --no-input
#python ./manage.py runserver 0.0.0.0:8000
exec gunicorn --bind 0.0.0.0:8000 api.wsgi:application #server de production on le remplacera par daphne