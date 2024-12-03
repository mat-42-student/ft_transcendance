from django.urls import path
from .views import *
# from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('signup', SignUpView.as_view(), name='signup'),
    path('login', LoginView.as_view(), name='login'),
    path('refresh', RefreshTokenView.as_view(), name='refresh'),
    path('ping', PingView.as_view(), name='ping'),

    path('logout', LogoutView.as_view(), name='logout'),
    path('2fa/enable-2fa', Enable2FAView.as_view(), name='enable-2fa'),
    path('2fa/disable-2fa', Disable2FAView.as_view(), name='disable-2fa'),
    path('oauth/redirect', OAuthRedirectView.as_view(), name='oauth-redirect'),
    path('oauth/callback', OAuthCallbackView.as_view(), name='oauth-callback'),
    # path('login', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    # path('send-otp/', SendOTPView.as_view(), name='send-otp'),
]   