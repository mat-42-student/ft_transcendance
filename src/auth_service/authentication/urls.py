from django.urls import path
from .views import *

urlpatterns = [
    path('login', LoginView.as_view(), name='login'),
    path('refresh', RefreshTokenView.as_view(), name='refresh'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('2fa/enroll', Enroll2FAView.as_view(), name='2fa-enroll'),
    path('2fa/verify', Verify2FAView.as_view(), name='2fa-verify'),
    path('2fa/disable', Disable2FAView.as_view(), name='2fa-disable'),
    path('oauth/redirect', OAuthRedirectView.as_view(), name='oauth-redirect'),
    path('oauth/callback', OAuthCallbackView.as_view(), name='oauth-callback'),
]
