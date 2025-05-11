from rest_framework.permissions import BasePermission

class IsAuthenticatedOrService(BasePermission):
    def has_permission(self, request, view):
        return bool(
            (isinstance(request.user, str)) or  # Service authentication
            (request.user and request.user.is_authenticated)  # User authentication
        )
