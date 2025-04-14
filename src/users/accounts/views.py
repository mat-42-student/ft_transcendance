import jwt
import datetime
import django.db.models as models
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.conf import settings
from .authentication import (
    JWTAuthentication,
    BackendJWTAuthentication
)
from .permissions import IsAuthenticatedOrService
# from .authentication import RemoteOAuth2Authentication
from django.core.exceptions import PermissionDenied
from rest_framework import viewsets, status
from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.renderers import JSONRenderer
from .models import User, Relationship, Game, Tournament
from .serializers import (
    UserListSerializer, 
    UserMinimalSerializer, 
    UserDetailSerializer, 
    UserPrivateDetailSerializer, 
    UserBlockedSerializer, 
    UserUpdateSerializer, 
    UserRegistrationSerializer,
    GameSerializer,
    RelationshipSerializer
)

class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.refresh_from_db() # Rafraîchir l'objet utilisateur pour s'assurer que toutes les données sont chargées

            # Générer un token JWT pour l'utilisateur
            access_payload = {
                'id': user.id,
                'username': user.username,
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15),
                'iat': datetime.datetime.now(datetime.timezone.utc),
            }

            refresh_payload = {
                'id': user.id,
                'username': user.username,
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
                'iat': datetime.datetime.now(datetime.timezone.utc),
            }

            access_token = jwt.encode(access_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])
            refresh_token = jwt.encode(refresh_payload, settings.FRONTEND_JWT["PRIVATE_KEY"], algorithm=settings.FRONTEND_JWT["ALGORITHM"])

            response = Response()
            response.set_cookie(
                key='refreshToken',
                value=refresh_token, 
                httponly=True,
                samesite='Lax',
                secure=True,
                path='/'
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
        """Définit les permissions pour chaque action."""
        if self.action in ['list', 'retrieve', 'contacts', 'friends', 'blocks']:
            return [AllowAny()]
        return [IsAuthenticatedOrService()]  # Authentification requise pour toutes les autres actions

    def get_serializer_class(self):
        """Définit le serializer selon l'action."""
        if self.action == 'list':
            return UserListSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserDetailSerializer  # Par défaut pour les autres
    
    def list(self, request, *args, **kwargs):
        """Renvoie une liste d'utilisateurs pour la recherche de profils via searchbar."""
        search_query = request.GET.get("search", "").strip()

        if search_query:
            users = User.objects.filter(username__istartswith=search_query)[:10]
        else:
            users = User.objects.none()  # Pas de recherche, pas de résultats

        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """Personnalise la récupération des détails d'un utilisateur."""
        user = self.get_object()  # Get target user

        # Handle backend service authentication (string-based user)
        if isinstance(request.user, str):
            # Service client using BackendJWTAuthentication
            serializer = UserDetailSerializer(user)
            return Response(serializer.data)

        # Handle human user authentication (User instance)
        if request.user.is_authenticated:
            # Check blocking relationships
            if request.user in user.blocked_users.all() or user in request.user.blocked_users.all():
                serializer = UserBlockedSerializer(user, context={'request': request})
                return Response(serializer.data)

            # Choose serializer based on ownership
            if request.user == user:
                serializer = UserPrivateDetailSerializer(user, context={'request': request})
            else:
                serializer = UserDetailSerializer(user)

            return Response(serializer.data)

        # Handle unauthenticated requests
        serializer = UserDetailSerializer(user)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """Permet la modification des donnés de l'utilisateur authentifié."""
        user = self.get_object()  # Récupère l'utilisateur ciblé par la requête
        if user != request.user: # Utilisateur connecté via JWT
            return Response({'detail': 'Vous ne pouvez modifier que votre propre profil.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True, context={'user': request.user})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        """Renvoie vers 'update'."""
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Permet à l'utilisateur authentifié de supprimer son compte."""
        user = self.get_object()
        if user != request.user:
            return Response({'detail': 'Vous ne pouvez pas supprimer un autre utilisateur.'}, status=status.HTTP_403_FORBIDDEN)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticatedOrService], url_path='block')
    def block_user(self, request, pk=None):
        """Bloquer un utilisateur."""
        try:
            user_to_block = User.objects.get(id=pk)
            if user_to_block in request.user.blocked_users.all():
                return Response({"detail": "Cet utilisateur est déjà bloqué."}, status=status.HTTP_400_BAD_REQUEST)

            # Ajouter l'utilisateur à la liste des bloqués
            request.user.blocked_users.add(user_to_block)

            # # Supprimer les relations existantes
            # request.user.relationships_initiated.filter(to_user=user_to_block).delete()
            # request.user.relationships_received.filter(from_user=user_to_block).delete()

            return Response({"detail": "Utilisateur bloqué."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticatedOrService], url_path='unblock')
    def unblock_user(self, request, pk=None):
        """Débloquer un utilisateur."""
        try:
            user_to_unblock = User.objects.get(id=pk)
            if user_to_unblock not in request.user.blocked_users.all():
                return Response({"detail": "Cet utilisateur n'est pas bloqué."}, status=status.HTTP_400_BAD_REQUEST)

            # Retirer l'utilisateur de la liste des bloqués
            request.user.blocked_users.remove(user_to_unblock)

            return Response({"detail": "Utilisateur débloqué."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['GET'], url_path='contacts')
    def get_user_contacts(self, request, pk=None):
        """
        Endpoint pour récupérer les amis et contacts bloqués d'un utilisateur.
        - Un utilisateur normal ne peut récupérer QUE ses propres contacts.
        - Un superutilisateur peut récupérer les contacts de n'importe quel utilisateur.
        """
        requested_user = self.get_object()  # Récupère l'utilisateur cible

        # Vérification des permissions
        if request.user != requested_user and not request.user.is_superuser:
            raise PermissionDenied("Vous n'avez pas la permission d'accéder aux contacts de cet utilisateur.")

        # Récupération des amis (relations où l'utilisateur est soit from_user soit to_user)
        friends = User.objects.filter(
            Q(relationships_initiated__to_user=requested_user, relationships_initiated__status='friend') |
            Q(relationships_received__from_user=requested_user, relationships_received__status='friend')
        ).exclude(id=requested_user.id).distinct()

        # Récupération des utilisateurs bloqués
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
        Endpoint pour récupérer la liste des amis d'un utilisateur donné.
        """
        requested_user = self.get_object()  # Get target user

        # Handle backend service authentication
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

        # Handle regular user authentication
        else:
            # Check permissions for human users
            if not request.user.is_authenticated:
                raise PermissionDenied("Authentication required")

            if request.user != requested_user and not request.user.is_superuser:
                raise PermissionDenied("You don't have permission to access these contacts")
            
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
        Endpoint pour récupérer les utilisateurs bloqués et ceux ayant bloqué l'utilisateur.
        """
        requested_user = self.get_object()  # Récupère l'utilisateur cible

        # Vérification des permissions
        if request.user != requested_user and not request.user.is_superuser:
            raise PermissionDenied("Vous n'avez pas la permission d'accéder aux contacts de cet utilisateur.")
        
        try:
            user = User.objects.get(pk=pk)
            blocked_users = user.blocked_users.all().distinct()
            blocked_by_users = user.blocked_by.all().distinct()

            serializer_blocked = UserMinimalSerializer(blocked_users, many=True)
            serializer_blocked_by = UserMinimalSerializer(blocked_by_users, many=True)

            return Response({
                'blocked_users': serializer_blocked.data,
                'blocked_by_users': serializer_blocked_by.data
            }, status=200)

        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

    @action(detail=True, methods=['GET'], url_path='profile')
    def get_user_profile(self, request, pk=None):
        """
        Récupère les informations dynamiques d'un utilisateur en tenant compte des relations.
        """
        user = request.user  # Utilisateur authentifié
        target_user = get_object_or_404(User, pk=pk)  # Utilisateur dont on veut voir le profil

        # Initialisation des données de base du profil
        response_data = {
            "id": target_user.id,
            "username": target_user.username,
            "avatar": target_user.avatar.url,
            "is_self": False,
            "is_friend": False,
            "is_blocked_by_user": False,
            "has_blocked_user": False,
            "message": None,
            "2fa": False,
            "last_games": [],
        }

        # Vérifier si l'utilisateur est celui consulté et si 2FA activée
        if user == target_user:
            response_data.update({"is_self": True})
            if user.is_2fa_enabled:
                response_data.update({"2fa": True})

        # Vérifier les statuts de blocage
        if target_user in user.blocked_users.all():
            response_data.update({
                "is_blocked_by_user": True,
                "message": "Vous avez bloqué cet utilisateur.",
            })
        elif target_user in user.blocked_by.all():
            response_data.update({
                "has_blocked_user": True,
                "message": "Vous avez été bloqué par cet utilisateur.",
            })
        # Vérifier si l'utilisateur est ami avec la personne consultée
        elif Relationship.objects.filter(
            Q(from_user=user, to_user=target_user, status='friend') |
            Q(from_user=target_user, to_user=user, status='friend')
        ).exists():
            response_data["is_friend"] = True

        # Récupérer les 10 dernières parties où l'utilisateur est impliqué
        games = Game.objects.filter(
            Q(player1=target_user) | Q(player2=target_user)
        ).order_by('-date')[:10]
        response_data["last_games"] = GameSerializer(games, many=True, context={'request': request, 'target_user': target_user}).data

        return Response(response_data, status=200)

    # @action(detail=True, methods=['GET'], url_path='profile')
    # def get_user_profile(self, request, pk=None):
    #     """
    #     Récupère les informations dynamiques d'un utilisateur en tenant compte des relations.
    #     """
    #     user = request.user  # Utilisateur authentifié
    #     target_user = get_object_or_404(User, pk=pk)  # Utilisateur dont on veut voir le profil

    #     # Initialisation des données de base du profil
    #     response_data = {
    #         "id": target_user.id,
    #         "username": target_user.username,
    #         "avatar": target_user.avatar.url,
    #         "is_self": False,
    #         "is_friend": False,
    #         "is_blocked_by_user": False,
    #         "has_blocked_user": False,
    #         "message": None,
    #         "2fa": False,
    #     }

    #     # Vérifier si l'utilisateur est celui consulté et si 2fa activée
    #     if (user == target_user):
    #         response_data.update({
    #             "is_self": True,
    #         })
    #         if (user.is_2fa_enabled == True):
    #             response_data.update({
    #                 "2fa": True,
    #             })

    #     # Vérifier les statuts de blocage
    #     if target_user in user.blocked_users.all():
    #         response_data.update({
    #             "is_blocked_by_user": True,
    #             "message": "Vous avez bloqué cet utilisateur.",
    #         })
    #     elif target_user in user.blocked_by.all():
    #         response_data.update({
    #             "has_blocked_user": True,
    #             "message": "Vous avez été bloqué par cet utilisateur.",
    #         })

    #     # Vérifier si l'utilisateur est ami avec la personne consultée
    #     elif Relationship.objects.filter(
    #         Q(from_user=user, to_user=target_user, status='friend') |
    #         Q(from_user=target_user, to_user=user, status='friend')
    #     ).exists():
    #         response_data["is_friend"] = True

    #     return Response(response_data, status=200)

# Relationship ViewSet
class RelationshipViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='add-friend')
    def add_friend(self, request, pk=None):
        """Envoyer une demande d'ami ou accepter automatiquement si l'autre utilisateur a déjà initié une demande."""
        to_user = get_object_or_404(User, id=pk)

        # Vérification des utilisateurs bloqués
        if to_user in request.user.blocked_users.all():
            return Response({"detail": "Vous avez bloqué cet utilisateur."}, status=status.HTTP_403_FORBIDDEN)
        if request.user in to_user.blocked_users.all():
            return Response({"detail": "Vous êtes bloqué par cet utilisateur."}, status=status.HTTP_403_FORBIDDEN)

        # Vérifier si une demande inverse existe
        try:
            existing_relation = Relationship.objects.get(from_user=to_user, to_user=request.user, status=Relationship.PENDING)
            # Si une demande inverse existe, l'accepter
            existing_relation.status = Relationship.FRIEND
            existing_relation.save()
            return Response({"detail": "Demande d'ami acceptée automatiquement."}, status=status.HTTP_200_OK)
        except Relationship.DoesNotExist:
            pass  # Continuer si aucune demande inverse n'existe

        # Vérifier ou créer une relation
        relation, created = Relationship.objects.get_or_create(from_user=request.user, to_user=to_user)
        if relation.status == Relationship.FRIEND:
            return Response({"detail": "Vous êtes déjà amis."}, status=status.HTTP_400_BAD_REQUEST)
        if relation.status == Relationship.PENDING:
            return Response({"detail": "Une demande est déjà en attente."}, status=status.HTTP_400_BAD_REQUEST)

        # Marquer la relation comme "pending"
        relation.status = Relationship.PENDING
        relation.save()
        return Response({"detail": "Demande d'ami envoyée."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='accept-friend')
    def accept_friend(self, request, pk=None):
        """Accepter une demande d'ami."""
        from_user = get_object_or_404(User, id=pk)

        # Vérification des utilisateurs bloqués
        if from_user in request.user.blocked_users.all():
            return Response({"detail": "Vous avez bloqué cet utilisateur."}, status=status.HTTP_403_FORBIDDEN)
        if request.user in from_user.blocked_users.all():
            return Response({"detail": "Vous êtes bloqué par cet utilisateur."}, status=status.HTTP_403_FORBIDDEN)

        # Chercher une demande d'ami en attente
        try:
            relation = Relationship.objects.get(from_user=from_user, to_user=request.user, status=Relationship.PENDING)
        except Relationship.DoesNotExist:
            return Response({"detail": "Aucune demande d'ami en attente."}, status=status.HTTP_404_NOT_FOUND)

        # Accepter la demande
        relation.status = Relationship.FRIEND
        relation.save()
        return Response({"detail": "Demande d'ami acceptée."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='remove-friend')
    def remove_friend(self, request, pk=None):
        """Supprimer un ami ou rejeter une demande d'ami en attente, y compris les blocages."""
        user = get_object_or_404(User, id=pk)

        try:
            # Rechercher la relation existante quelle que soit la direction et l'état (y compris bloqué)
            relation = Relationship.objects.get(
                (Q(from_user=request.user, to_user=user) | Q(from_user=user, to_user=request.user)) &
                Q(status__in=[Relationship.FRIEND, Relationship.PENDING])
            )
        except Relationship.DoesNotExist:
            return Response({"detail": "Aucune relation trouvée."}, status=status.HTTP_404_NOT_FOUND)

        # Supprimer tout blocage existant entre les deux utilisateurs, dans les deux sens
        if user in request.user.blocked_users.all():
            request.user.blocked_users.remove(user)
        if request.user in user.blocked_users.all():
            user.blocked_users.remove(request.user)

        # Supprimer la relation elle-même
        relation.delete()
        return Response({"detail": "Relation supprimée avec succès, y compris tout blocage."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='received-requests')
    def get_friend_requests_received(self, request):
        """Récupérer les demandes d'ami reçues par l'utilisateur."""
        user = request.user

        # Récupérer les utilisateurs qui ont envoyé une demande d'ami à l'utilisateur courant
        received_requests = Relationship.objects.filter(
            to_user=user,
            status=Relationship.PENDING
        ).values_list('from_user', flat=True)  # Récupère uniquement les IDs des utilisateurs

        users = User.objects.filter(id__in=received_requests)
        data = UserMinimalSerializer(users, many=True).data

        return Response({"received_requests": data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='sent-requests')
    def get_friend_requests_sent(self, request):
        """Récupérer les demandes d'ami envoyées par l'utilisateur."""
        user = request.user

        # Récupérer les utilisateurs à qui l'utilisateur courant a envoyé une demande d'ami
        sent_requests = Relationship.objects.filter(
            from_user=user,
            status=Relationship.PENDING
        ).values_list('to_user', flat=True)  # Récupère uniquement les IDs des utilisateurs

        users = User.objects.filter(id__in=sent_requests)
        data = UserMinimalSerializer(users, many=True).data

        return Response({"sent_requests": data}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='pending-count')
    def get_pending_requests_count(self, request):
        """Récupérer le nombre de demandes d'ami en attente pour l'utilisateur."""
        user = request.user
        pending_count = Relationship.objects.filter(to_user=user, status=Relationship.PENDING).count()
        return Response({"pending_count": pending_count}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='my-relationships')
    def get_user_relationships(self, request):
        """Récupérer les relations de l'utilisateur."""
        user = request.user

        # Récupération des relations
        friends = Relationship.objects.filter(
            (models.Q(from_user=user) | models.Q(to_user=user)),
            status=Relationship.FRIEND
        )
        sent_requests = Relationship.objects.filter(from_user=user, status=Relationship.PENDING)
        received_requests = Relationship.objects.filter(to_user=user, status=Relationship.PENDING)

        # Sérialisation des relations
        data = {
            "friends": RelationshipSerializer(friends, many=True).data,
            "sent_requests": RelationshipSerializer(sent_requests, many=True).data,
            "received_requests": RelationshipSerializer(received_requests, many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)