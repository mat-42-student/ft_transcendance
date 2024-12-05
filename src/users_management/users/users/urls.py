from django.conf import settings
from django.conf.urls.static import static

from django.urls import path, include
from django.contrib import admin

from rest_framework import routers
from rest_framework_simplejwt import views as jwt_views

from accounts.views import (
    UserRegisterView, 
    UserLoginView, 
    UserViewSet, 
    RelationshipViewSet
)

router = routers.SimpleRouter()
router.register('users', UserViewSet, basename='users')
router.register('relationships', RelationshipViewSet, basename='relationships')

urlpatterns = [
    path('admin/', admin.site.urls), # admin landing URL
    path('api/token/', jwt_views.TokenObtainPairView.as_view(), name='token_obtain_pair'), # token generation URL
    path('api/token/refresh/', jwt_views.TokenRefreshView.as_view(), name='token_refresh'), # token refresh URL
    path('users_api/register/', UserRegisterView.as_view(), name='register'),  # registration URL
    path('users_api/login/', UserLoginView.as_view(), name='login'), # login URL
    path('users_api/', include(router.urls)), # router include for ViewSets
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
