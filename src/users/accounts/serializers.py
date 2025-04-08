from rest_framework import serializers

from django.contrib.auth.hashers import check_password
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError

from PIL import Image

from .models import User, Relationship, Game, Tournament


# User 'list' serializer
class UserListSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = ['id', 'username']


# FrontEnd listing User 'retrieve' serializer
class UserMinimalSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar']
        read_only_fields = ['id', 'username', 'avatar']

    def get_avatar(self, obj):
        return obj.avatar.name.split('/')[-1] if obj.avatar else "default.png"


# User 'retrieve' serializer
class UserDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'is_2fa_enabled']
        read_only_fields = ['id', 'username', 'avatar', 'is_2fa_enabled']

    def get_avatar(self, obj):
        return obj.avatar.name.split('/')[-1] if obj.avatar else "default.png"


# User private 'retrieve' serializer
class UserPrivateDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'is_2fa_enabled', 'blocked_users']
        read_only_fields = ['id', 'username', 'avatar', 'is_2fa_enabled', 'blocked_users']

    def get_avatar(self, obj):
        return obj.avatar.name.split('/')[-1] if obj.avatar else "default.png"


# Blocked User 'retrieve' serializer
class UserBlockedSerializer(serializers.ModelSerializer):
    message = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['username', 'avatar', 'message']

    def get_avatar(self, obj):
        return obj.avatar.name.split('/')[-1] if obj.avatar else "default.png"

    def get_message(self, obj):
        request_user = self.context.get('request').user
        if obj in request_user.blocked_users.all():
            return "Vous avez bloqué cet utilisateur."
        else:
            return "Cet utilisateur vous a bloqué."


# User 'update' & 'partial_update' serializer
class UserUpdateSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'confirm_password', 'password', 'avatar']
        extra_kwargs = {
            'username': {
                'min_length': 3, 
                'max_length': 50,
                'label': 'Nom d’utilisateur'
            },
            'confirm_password': {
                'write_only': True,
                'label': 'Mot de passe actuel'
            },
            'password': {
                'write_only': True,
                'min_length': 5,
                'max_length': 128,
                'label': 'Nouveau mot de passe'
            },
        }

    def validate(self, data):
        user = self.context['user']
        
        # Vérification du username
        username = data.get('username')
        if username and User.objects.filter(username=username).exclude(id=user.id).exists():
            raise serializers.ValidationError({"username": "Ce nom d'utilisateur est déjà pris. Veuillez en choisir un autre."})

        # Vérification du mot de passe actuel et du nouveau mot de passe
        password = data.get('confirm_password', None)
        new_password = data.get('password', None)

        # Si l'un des deux champs est présent sans l'autre
        if (password and not new_password) or (new_password and not password):
            raise serializers.ValidationError({"password": "Veuillez fournir à la fois le mot de passe actuel et le nouveau mot de passe pour la mise à jour."})

        # Vérifier que le mot de passe actuel est correct si fourni
        if password and not user.check_password(password):
            raise serializers.ValidationError({"confirm_password": "Le mot de passe actuel est incorrect."})

        return data

    def validate_avatar(self, avatar):
        try:
            img = Image.open(avatar)
            img.verify()  # Vérifie que le fichier est bien une image
            if img.format not in ['JPEG', 'PNG']:  # Formats acceptés
                raise serializers.ValidationError("Seuls les formats JPEG et PNG sont autorisés.")
            # Recharger l'image pour s'assurer qu'elle est valide
            img = Image.open(avatar)
            img.load()
        except (IOError, ValidationError):
            raise serializers.ValidationError("Le fichier de l'avatar doit être une image valide.")
        
        return avatar
        
    def update(self, instance, validated_data):
        validated_data.pop('confirm_password', None)  # Supprime `password` des données validées

        # Suppression de l'ancien fichier avatar si un nouvel avatar est uploadé


        # Gestion du nouveau username
        new_username = validated_data.get('username')
        if new_username:
            instance.username = new_username
        
        # Gestion du nouveau mot de passe
        new_password = validated_data.pop('password', None)
        if new_password:
            instance.set_password(new_password)
        
        # Gestion du nouvel avatar
        new_avatar = validated_data.get('avatar', None)
        if new_avatar is not None:
            if instance.avatar.name != 'default.png':
                if default_storage.exists(instance.avatar.path):  # Vérifie si le fichier existe
                    default_storage.delete(instance.avatar.path)  # Supprime le fichier
            instance.avatar = new_avatar
        
        return super().update(instance, validated_data)


# User registration serializer
class UserRegistrationSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password']
        extra_kwargs = {
            'username': {
                'min_length': 2, 
                'max_length': 50,
                'label': 'Username',
                'error_messages': {
                    'unique': 'Username is already taken.'
                }
            },
            'email': {
                'min_length': 5, 
                'max_length': 100,
                'label': 'Email',
                'error_messages': {
                    'unique': 'Email is already registered.'
                }
            },
            'password': {
                'write_only': True,
                'min_length': 5,
                'max_length': 128,
                'label': 'Password'
            },
            'confirm_password': {
                'write_only': True,
                'label': 'Confirm password'
            },
        }

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords don't match.")
            # Ne pas accepter `is_staff` ou `is_superuser` dans les données
        if 'is_staff' in data or 'is_superuser' in data:
            raise serializers.ValidationError("La création d'un super utilisateur est interdite via cette API.")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')  # Supprime `confirm_password` des données validées
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email']
        )
        user.save()
        return user
    


# Relationship 'detail' serializer
class RelationshipSerializer(serializers.ModelSerializer):
    from_user = UserDetailSerializer(read_only=True)
    to_user = UserDetailSerializer(read_only=True)

    class Meta:
        model = Relationship
        fields = ['id', 'from_user', 'to_user', 'status', 'created_at']
        read_only_fields = ['id', 'from_user', 'to_user', 'status', 'created_at']


# User Relationship 'list' serializer
class UserRelationshipsSerializer(serializers.Serializer):
    friends = RelationshipSerializer(many=True)
    sent_requests = RelationshipSerializer(many=True)
    received_requests = RelationshipSerializer(many=True)


class GameSerializer(serializers.ModelSerializer):
    result = serializers.SerializerMethodField()
    player1 = serializers.CharField(source='player1.username')
    player2 = serializers.CharField(source='player2.username')
    tournament = serializers.SerializerMethodField()
    tournament_organizer = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = ['id', 'result', 'player1', 'player2', 'score_player1', 'score_player2', 'date', 'tournament', 'tournament_organizer']

    def get_result(self, obj):
        """
        Détermine si l'utilisateur ciblé par la requête a gagné ou perdu la partie.
        """
        request = self.context.get('request')
        user = request.user
        if user == obj.player1:
            return "Victory" if obj.score_player1 > obj.score_player2 else "Defeat"
        elif user == obj.player2:
            return "Victory" if obj.score_player2 > obj.score_player1 else "Defeat"
        return "Not Involved"

    def get_tournament(self, obj):
        """
        Vérifie si la partie est liée à un tournoi.
        """
        return obj.tournament is not None

    def get_tournament_organizer(self, obj):
        """
        Récupère l'organisateur du tournoi si applicable.
        """
        if obj.tournament:
            return obj.tournament.organizer.username
        return None
