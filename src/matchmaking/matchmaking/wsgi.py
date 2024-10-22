"""
<<<<<<<< HEAD:src/_Pong/_Pong/wsgi.py
WSGI config for _Pong project.
========
WSGI config for matchmaking project.
>>>>>>>> origin/matchmaking:src/matchmaking/matchmaking/wsgi.py

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

<<<<<<<< HEAD:src/_Pong/_Pong/wsgi.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '_Pong.settings')
========
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'matchmaking.settings')
>>>>>>>> origin/matchmaking:src/matchmaking/matchmaking/wsgi.py

application = get_wsgi_application()
