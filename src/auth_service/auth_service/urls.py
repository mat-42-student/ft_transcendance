# from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib import admin
from django.urls import path, include
# from two_factor.urls import urlpatterns as tf_urls

urlpatterns = [
    # path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    # path('', include(tf_urls)),
]
