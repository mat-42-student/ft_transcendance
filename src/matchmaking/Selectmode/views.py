from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from Selectmode.models import User, Mode, Salon
from Selectmode.serializer import UserSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import json
# Create your views here.

def test(request):
    data = "style la requete !!!!"
    if (request.method == 'GET'):
        return (JsonResponse(data, safe=False))

class Userview(APIView):
    def get(self, request):
        print('SALUT from ws')
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)