from django.contrib import admin
from django.urls import path, include
from Selectmode.views import test, Userview


urlpatterns = [
    path('users/', Userview.as_view()),
    path('test/', test),
]