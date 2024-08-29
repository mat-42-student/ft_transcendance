from django.contrib import admin
from django.urls import path
from transcendance.views import test

urlpatterns = [
    path('test/', test)
]