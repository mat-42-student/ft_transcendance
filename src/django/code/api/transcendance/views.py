
from django.shortcuts import render
from rest_framework.response import Response
from django.http import HttpResponse, JsonResponse
from transcendance.models import User
from rest_framework import status
from rest_framework.decorators import api_view
from transcendance.serializer import UserSerializer

def test(request):
    data = "style la requete !!!!"
    if (request.method == 'GET'):
        return (JsonResponse(data, safe=False))

