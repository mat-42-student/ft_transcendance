from django.conf import settings
from django.conf.urls.static import static

from django.urls import path, include
from django.contrib import admin

from rest_framework import routers
from rest_framework_simplejwt import views as jwt_views

from accounts.views import (
    UserRegisterView, 
    UserViewSet, 
    RelationshipViewSet,
)

router = routers.SimpleRouter()
router.register('accounts', UserViewSet, basename='accounts')
router.register('relationships', RelationshipViewSet, basename='relationships')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/users/register/', UserRegisterView.as_view(), name='register'),
    path('api/v1/users/', include(router.urls)), # router include for ViewSets
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
