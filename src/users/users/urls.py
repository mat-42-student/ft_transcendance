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
    VerifyCredentialsView,
    Enable2FAView,
)

router = routers.SimpleRouter()
router.register('users', UserViewSet, basename='users')
router.register('relationships', RelationshipViewSet, basename='relationships')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/users/register/', UserRegisterView.as_view(), name='register'),
    path('api/v1/users/verify', VerifyCredentialsView.as_view(), name='verify-credentials'),
    path('api/v1/users/<int:user_id>/enable_2fa', Enable2FAView.as_view(), name='enable_2fa'),
    path('api/v1/users', include(router.urls)), # router include for ViewSets
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
