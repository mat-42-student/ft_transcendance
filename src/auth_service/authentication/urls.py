from django.urls import path
from .views import *

urlpatterns = [
    path('login', LoginView.as_view(), name='login'),
    path('refresh', RefreshTokenView.as_view(), name='refresh'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('2fa/enable-2fa', Enable2FAView.as_view(), name='enable-2fa'),
    path('2fa/disable-2fa', Disable2FAView.as_view(), name='disable-2fa'),
    path('oauth/redirect', OAuthRedirectView.as_view(), name='oauth-redirect'),
    path('oauth/callback', OAuthCallbackView.as_view(), name='oauth-callback'),
]   