import jwt
import datetime
import uuid
import django.db.models as models
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.conf import settings

# from .authentication import (
#     JWTAuthentication,
#     BackendJWTAuthentication
# )

from .permissions import IsAuthenticatedOrService
from django.core.exceptions import PermissionDenied
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.renderers import JSONRenderer
from .models import User, Relationship, Game

from .serializers import (
    PasswordValidationSerializer,
    UserListSerializer, 
    UserMicroSerializer,
    UserMinimalSerializer, 
    UserDetailSerializer, 
    UserPrivateDetailSerializer, 
    UserBlockedSerializer, 
    UserUpdateSerializer, 
    UserRegistrationSerializer,
    GameSerializer,
    # RelationshipSerializer
)

class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        
        username = request.data.get('username')
        if username and User.objects.filter(username=username).exists():
            return Response(
                {"error": "Registration failed. Please try again."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Check if the UUID field exists and set it if needed
            if hasattr(user, 'uuid') and user.uuid is None:
                user.uuid = uuid.uuid4()
                user.save(update_fields=['uuid'])

            user.refresh_from_db()

            # Generate a JWT token for the user
            access_payload = {
                'id': user.id,
                'uuid': str(user.uuid),
                'username': user.username,
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=120),
                'iat': datetime.datetime.now(datetime.timezone.utc),
                'jti': str(uuid.uuid4()),
                'typ': "user",
                'oauth': False,
                'avatar': user.avatar.url if user.avatar else None
            }

            refresh_payload = {
                'id': user.id,
                'uuid': str(user.uuid), 
                'username': user.username,
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
                'iat': datetime.datetime.now(datetime.timezone.utc),
                'jti': str(uuid.uuid4()),
                'typ': "user",
                'oauth': False,
                'avatar': user.avatar.url if user.avatar else None
            }

            witness_payload = {
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
            }

            witness_token = jwt.encode(witness_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])
            access_token = jwt.encode(access_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])
            refresh_token = jwt.encode(refresh_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])

            response = Response()
            response.set_cookie(
                key='refreshToken',
                value=refresh_token,
                expires=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
                httponly=True,
                samesite='Lax',
                secure=True,
                path='/'
            )

            response.set_cookie(
                key='witnessToken',
                value=witness_token, 
                expires=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
            )

            response.data = {
                'success': 'true',
                'accessToken': access_token
            }
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# User ViewSet
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()

    def get_permissions(self):
        """Defines permissions for each action."""
        if self.action in ['list', 'retrieve', 'get_user_contacts', 'get_user_friends', 'get_user_blocks']:
            return [AllowAny()]
        return [IsAuthenticatedOrService()]

    def get_serializer_class(self):
        """Returns the appropriate serializer depending on the action."""
        if self.action in ['list', 'list_all_users']:
            return UserListSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserDetailSerializer  # Default serializer for other actions

    def list(self, request, *args, **kwargs):
        """
        Returns a list with the user whose username exactly matches the search query.
        """
        search_query = request.GET.get("search", "").strip()

        if search_query:
            users = User.objects.filter(username__iexact=search_query)[:1]
        else:
            users = User.objects.none()

        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """Customize how user details are retrieved."""
        user = self.get_object()

        if isinstance(request.user, str):
            serializer = UserDetailSerializer(user)
            return Response(serializer.data)

        if request.user.is_authenticated:
            if request.user in user.blocked_users.all() or user in request.user.blocked_users.all():
                serializer = UserBlockedSerializer(user, context={'request': request})
                return Response(serializer.data)

            if request.user == user:
                serializer = UserPrivateDetailSerializer(user, context={'request': request})
            else:
                serializer = UserDetailSerializer(user)

            return Response(serializer.data)

        serializer = UserDetailSerializer(user)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """Allows updating the authenticated user's data."""
        user = self.get_object()
        if user != request.user:
            return Response({'detail': 'You can only update your own profile.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True, context={'user': request.user})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        """Alias for 'update'."""
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        if user != request.user:
            return Response({'detail': 'You cannot delete another user.'}, status=status.HTTP_403_FORBIDDEN)

        if user.has_usable_password():
            serializer = PasswordValidationSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticatedOrService], url_path='block')
    def block_user(self, request, pk=None):
        """Block another user."""
        try:
            user_to_block = User.objects.get(id=pk)
            if user_to_block in request.user.blocked_users.all():
                return Response({"detail": "This user is already blocked."}, status=status.HTTP_400_BAD_REQUEST)
            
            request.user.blocked_users.add(user_to_block)

            return Response({"detail": "User blocked."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticatedOrService], url_path='unblock')
    def unblock_user(self, request, pk=None):
        """Unblock a user."""
        try:
            user_to_unblock = User.objects.get(id=pk)
            if user_to_unblock not in request.user.blocked_users.all():
                return Response({"detail": "This user is not blocked."}, status=status.HTTP_400_BAD_REQUEST)

            request.user.blocked_users.remove(user_to_unblock)

            return Response({"detail": "User unblocked."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['GET'], url_path='contacts')
    def get_user_contacts(self, request, pk=None):
        """
        Endpoint to retrieve the user's friends and blocked contacts.
        """
        requested_user = self.get_object()

        if request.user != requested_user:
            raise PermissionDenied("You do not have permission to access this user's contacts.")

        friends = User.objects.filter(
            Q(relationships_initiated__to_user=requested_user, relationships_initiated__status='friend') |
            Q(relationships_received__from_user=requested_user, relationships_received__status='friend')
        ).exclude(id=requested_user.id).distinct()

        blocked_users = requested_user.blocked_users.all()
        blocked_by_users = requested_user.blocked_by.all()

        return Response({
            'friends': UserMinimalSerializer(friends, many=True).data,
            'blocked_users': UserMinimalSerializer(blocked_users, many=True).data,
            'blocked_by_users': UserMinimalSerializer(blocked_by_users, many=True).data
        }, status=200)

    @action(detail=True, methods=['GET'], url_path='friends')
    def get_user_friends(self, request, pk=None):
        """
        Endpoint to get the list of friends of a specific user.
        """
        requested_user = self.get_object()

        if isinstance(request.user, str):
            try:
                user = User.objects.get(pk=pk)
                friends = User.objects.filter(
                    Q(relationships_initiated__to_user=user, relationships_initiated__status='friend') |
                    Q(relationships_received__from_user=user, relationships_received__status='friend')
                ).distinct()

                serializer = UserMinimalSerializer(friends, many=True)
                return Response({'friends': serializer.data}, status=200)

            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=404)

        else:
            if not request.user.is_authenticated:
                raise PermissionDenied("Authentication required")

            if request.user != requested_user:
                raise PermissionDenied("You do not have permission to access these contacts")
            
            try:
                user = User.objects.get(pk=pk)
                friends = User.objects.filter(
                    Q(relationships_initiated__to_user=user, relationships_initiated__status='friend') |
                    Q(relationships_received__from_user=user, relationships_received__status='friend')
                ).distinct()

                serializer = UserMinimalSerializer(friends, many=True)
                return Response({'friends': serializer.data}, status=200)

            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=404)

    @action(detail=True, methods=['GET'], url_path='blocks')
    def get_user_blocks(self, request, pk=None):
        """
        Endpoint to retrieve users blocked by and blocking the specified user.
        """

        try:
            user = User.objects.get(pk=pk)
            blocked_users = user.blocked_users.all().distinct()
            serializer_blocked = UserMicroSerializer(blocked_users, many=True)
            return Response(serializer_blocked.data, status=200)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
    @action(detail=True, methods=['GET'], permission_classes=[IsAuthenticatedOrService], url_path='muted')
    def is_blocked(self, request, pk=None):
        """
        Check if the target user is blocked by the authenticated user.
        """
        try:
            user_to_check = User.objects.get(id=pk)
            is_blocked = user_to_check in request.user.blocked_users.all()
            return Response({'is_blocked': is_blocked}, status=200)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

    @action(detail=True, methods=['GET'], url_path='profile')
    def get_user_profile(self, request, pk=None):
        """
        Retrieve dynamic user profile information based on relationships.
        """
        user = request.user
        target_user = get_object_or_404(User, pk=pk)

        response_data = {
            "id": target_user.id,
            "username": target_user.username,
            "avatar": target_user.avatar.url,
            "is_self": False,
            "is_friend": False,
            "is_blocked_by_user": False,
            "has_blocked_user": False,
            "is_pending": False,
            "message": None,
            "is_2fa_enabled": False,
            "last_games": [],
        }

        if user == target_user:
            response_data.update({"is_self": True})
            if user.is_2fa_enabled:
                response_data.update({"is_2fa_enabled": user.is_2fa_enabled})

        if target_user in user.blocked_users.all():
            response_data.update({
                "is_blocked_by_user": True,
                "message": "You have muted this user.",
            })
        elif target_user in user.blocked_by.all():
            response_data.update({
                "has_blocked_user": True,
                "message": "You have been muted by this user.",
            })

        if Relationship.objects.filter(
            Q(from_user=user, to_user=target_user, status='friend') |
            Q(from_user=target_user, to_user=user, status='friend')
        ).exists():
            response_data["is_friend"] = True
        elif Relationship.objects.filter(
            Q(from_user=user, to_user=target_user, status='pending')
        ).exists():
            response_data["is_pending"] = True

        games = Game.objects.filter(
            Q(player1=target_user) | Q(player2=target_user)
        ).order_by('-date')[:10]
        response_data["last_games"] = GameSerializer(games, many=True, context={'request': request, 'target_user': target_user}).data

        return Response(response_data, status=200)


# Relationship ViewSet
class RelationshipViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='add-friend')
    def add_friend(self, request, pk=None):
        """Send a friend request or automatically accept if the other user has already sent one."""
        to_user = get_object_or_404(User, id=pk)

        if to_user == request.user:
            return Response({"detail": "You cannot add yourself as a friend."}, status=status.HTTP_400_BAD_REQUEST)

        # Check for blocked users
        if to_user in request.user.blocked_users.all():
            return Response({"detail": "You have blocked this user."}, status=status.HTTP_403_FORBIDDEN)
        if request.user in to_user.blocked_users.all():
            return Response({"detail": "You are blocked by this user."}, status=status.HTTP_403_FORBIDDEN)

        # Check if a relationship already exists in either direction
        relation = Relationship.objects.filter(
            Q(from_user=request.user, to_user=to_user) |
            Q(from_user=to_user, to_user=request.user)
        ).first()

        if relation:
            if relation.status == Relationship.FRIEND:
                return Response({"detail": "You are already friends."}, status=status.HTTP_400_BAD_REQUEST)
            elif relation.status == Relationship.PENDING:
                if relation.from_user == request.user:
                    return Response({"detail": "A friend request is already pending."}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    # Pending request from the other user → auto accept
                    relation.status = Relationship.FRIEND
                    relation.save()
                    return Response({"detail": "Friend request automatically accepted."}, status=status.HTTP_200_OK)

        # No existing relationship → create a new request
        Relationship.objects.create(from_user=request.user, to_user=to_user, status=Relationship.PENDING)
        return Response({"detail": "Friend request sent."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='accept-friend')
    def accept_friend(self, request, pk=None):
        """Accept a friend request."""
        from_user = get_object_or_404(User, id=pk)

        # Check for blocked users
        if from_user in request.user.blocked_users.all():
            return Response({"detail": "You have blocked this user."}, status=status.HTTP_403_FORBIDDEN)
        if request.user in from_user.blocked_users.all():
            return Response({"detail": "You are blocked by this user."}, status=status.HTTP_403_FORBIDDEN)

        # Look for a pending friend request
        try:
            relation = Relationship.objects.get(from_user=from_user, to_user=request.user, status=Relationship.PENDING)
        except Relationship.DoesNotExist:
            return Response({"detail": "No pending friend request found."}, status=status.HTTP_404_NOT_FOUND)

        # Accept the request
        relation.status = Relationship.FRIEND
        relation.save()
        return Response({"detail": "Friend request accepted."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='remove-friend')
    def remove_friend(self, request, pk=None):
        """Remove a friend or reject a pending request, including removing any blocks."""
        user = get_object_or_404(User, id=pk)

        try:
            # Find the existing relationship regardless of direction and status (including blocked)
            relation = Relationship.objects.get(
                (Q(from_user=request.user, to_user=user) | Q(from_user=user, to_user=request.user)) &
                Q(status__in=[Relationship.FRIEND, Relationship.PENDING])
            )
        except Relationship.DoesNotExist:
            return Response({"detail": "No relationship found."}, status=status.HTTP_404_NOT_FOUND)

        # Remove any existing block between the two users, in both directions
        if user in request.user.blocked_users.all():
            request.user.blocked_users.remove(user)
        if request.user in user.blocked_users.all():
            user.blocked_users.remove(request.user)

        # Delete the relationship
        relation.delete()
        return Response({"detail": "Relationship successfully removed, including any blocks."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='received-requests')
    def get_friend_requests_received(self, request):
        """Retrieve friend requests received by the user."""
        user = request.user

        # Get users who sent a friend request to the current user
        received_requests = Relationship.objects.filter(
            to_user=user,
            status=Relationship.PENDING
        ).values_list('from_user', flat=True)  # Only get user IDs

        users = User.objects.filter(id__in=received_requests)
        data = UserMinimalSerializer(users, many=True).data

        return Response({"received_requests": data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='sent-requests')
    def get_friend_requests_sent(self, request):
        """Retrieve friend requests sent by the user."""
        user = request.user

        # Get users the current user has sent a friend request to
        sent_requests = Relationship.objects.filter(
            from_user=user,
            status=Relationship.PENDING
        ).values_list('to_user', flat=True)  # Only get user IDs

        users = User.objects.filter(id__in=sent_requests)
        data = UserMinimalSerializer(users, many=True).data

        return Response({"sent_requests": data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='pending-count')
    def get_pending_requests_count(self, request):
        """Retrieve the number of pending friend requests for the user."""
        user = request.user
        pending_count = Relationship.objects.filter(to_user=user, status=Relationship.PENDING).count()
        return Response({"pending_count": pending_count}, status=status.HTTP_200_OK)