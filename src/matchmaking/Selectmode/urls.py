from django.contrib import admin
from django.urls import path, include
from Selectmode.views import test, Userview


urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', Userview.as_view()),
    path('test/', test),
]