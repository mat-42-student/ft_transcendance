from django.shortcuts import render
from django.http import JsonResponse

def go(request):
    data = "PONG server !"
    if (request.method == 'GET'):
        return (JsonResponse(data, safe=False))

