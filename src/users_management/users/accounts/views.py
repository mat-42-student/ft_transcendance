import django.db.models as models
from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import User, Relationship
from .serializers import (
    UserListSerializer, 
    UserDetailSerializer, 
    UserPrivateDetailSerializer, 
    UserBlockedSerializer, 
    UserUpdateSerializer, 
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    RelationshipSerializer
)


# User registration APIView
class UserRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            print(user)
            user.refresh_from_db() # Rafraîchir l'objet utilisateur pour s'assurer que toutes les données sont chargées
            print(user.__class__)
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# User login APIView
class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            print("Utilisateur existe et identifiants correctes")
            username = serializer.validated_data['username'] # Obtenir l'utilisateur à partir du serializer
            user = User.objects.get(username=username)

            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# User ViewSet
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()

    def get_permissions(self):
        """Définit les permissions pour chaque action."""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]  # Authentification requise pour toutes les autres actions

    def get_serializer_class(self):
        """Définit le serializer selon l'action."""
        if self.action == 'list':
            return UserListSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserDetailSerializer  # Par défaut pour les autres

    def retrieve(self, request, *args, **kwargs):
        """Personnalise la récupération des détails d'un utilisateur."""
        user = self.get_object()  # Récupère l'utilisateur ciblé par la requête

        # Vérifie si le client est authentifié
        if request.user.is_authenticated:
            # Vérifie les relations de blocage
            if request.user in user.blocked_users.all() or user in request.user.blocked_users.all():  # L'utilisateur ciblé a bloqué le client
                serializer = UserBlockedSerializer(user, context={'request': request})
            # Utilise le serializer privé pour l'utilisateur authentifié
            elif request.user == user:
                serializer = UserPrivateDetailSerializer(user, context={'request': request})
            else:    
                serializer = UserDetailSerializer(user)
            return Response(serializer.data)
        # Si le client n'est pas authentifié, utilise le serializer public
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='block')
    def block_user(self, request, pk=None):
        """Bloquer un utilisateur."""
        try:
            user_to_block = User.objects.get(id=pk)
            if user_to_block in request.user.blocked_users.all():
                return Response({"detail": "Cet utilisateur est déjà bloqué."}, status=status.HTTP_400_BAD_REQUEST)

            # Ajouter l'utilisateur à la liste des bloqués
            request.user.blocked_users.add(user_to_block)

            # Supprimer les relations existantes
            request.user.relationships_initiated.filter(to_user=user_to_block).delete()
            request.user.relationships_received.filter(from_user=user_to_block).delete()

            return Response({"detail": "Utilisateur bloqué."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated], url_path='unblock')
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


# Relationship ViewSet
class RelationshipViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

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
        """Supprimer un ami."""
        friend = get_object_or_404(User, id=pk)

        try:
            # Trouver la relation existante quelle que soit la direction
            relation = Relationship.objects.get(
                Q(from_user=request.user, to_user=friend) | 
                Q(from_user=friend, to_user=request.user), 
                status=Relationship.FRIEND
            )
        except Relationship.DoesNotExist:
            return Response({"detail": "Cette relation n'existe pas."}, status=status.HTTP_404_NOT_FOUND)

        # Supprimer la relation
        relation.status = Relationship.NONE
        relation.save()
        return Response({"detail": "Ami supprimé."}, status=status.HTTP_200_OK)
