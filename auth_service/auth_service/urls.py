from django.urls import path
from authentication.views import *

urlpatterns = [
    path('api/v1/auth/login/', LoginView.as_view(), name='login'),
    path('api/v1/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/v1/auth/refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('api/v1/auth/verify/', VerifyTokenView.as_view(), name='verify'),
    path('api/v1/auth/public-key/', PublicKeyView.as_view(), name='public-key'),
    path('api/v1/auth/2fa/enroll/', Enroll2FAView.as_view(), name='2fa-enroll'),
    path('api/v1/auth/2fa/verify/', Verify2FAView.as_view(), name='2fa-verify'),
    path('api/v1/auth/2fa/disable/', Disable2FAView.as_view(), name='2fa-disable'),
    path('api/v1/auth/2fa/status/', Get2FAStatusView.as_view(), name='2fa-status'),
    path('api/v1/auth/oauth/login/', OAuthLoginView.as_view(), name='oauth-login'),
    path('api/v1/auth/oauth/callback/', OAuthCallbackView.as_view(), name='oauth-callback'),
]
