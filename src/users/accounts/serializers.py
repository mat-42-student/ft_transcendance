from rest_framework import serializers

from django.contrib.auth.hashers import check_password
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError

from PIL import Image

from .models import User, Relationship, Game, Tournament

class PasswordValidationSerializer(serializers.Serializer):
    password = serializers.CharField()

    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe incorrect.")
        return value


# User 'list' serializer
class UserListSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = ['id', 'username']


class UserMicroSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id']
        read_only_fields = ['id']


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

class UserUpdateSerializer(serializers.ModelSerializer):
    new_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['avatar', 'password', 'new_password', 'confirm_password']
        extra_kwargs = {
            'password': {
                'write_only': True,
                'label': 'Current password'
            },
            'new_password': {
                'write_only': True,
                'min_length': 8,
                'max_length': 128,
                'label': 'New password'
            },
            'confirm_password': {
                'write_only': True,
                'label': 'Confirm new password'
            },
        }

    def validate(self, data):
        if not data:
            raise serializers.ValidationError("Le formulaire est vide : aucun champ n’a été renseigné.")
        user = self.context['user']

        password = data.get('password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        if (new_password or confirm_password) and not password:
            raise serializers.ValidationError({"password": "Your current password is needed to update it."})
        
        if (not new_password or not confirm_password) and password:
            raise serializers.ValidationError({"new_password": "You did not provide a new password."})

        if (new_password and not confirm_password) or (confirm_password and not new_password):
            raise serializers.ValidationError({"new_password": "You must fill both `new_password` and `confirm_password` to update your password."})
        
        if password and new_password and password == new_password:
            raise serializers.ValidationError({"new_password": "The new password must be different from the old one."})

        if new_password and confirm_password and new_password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        if password and not user.check_password(password):
            raise serializers.ValidationError({"password": "The current password is incorrect."})

        return data

    def validate_new_password(self, value):
        if not value:
            return value

        # Password policy (identique à celle du UserRegistrationSerializer)
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not any(char in "!@#$%^&*()-_=+[]{}|;:'\",.<>/?" for char in value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        if any(pattern in value.lower() for pattern in ['password', '123456', 'qwerty', 'admin']):
            raise serializers.ValidationError("Password contains a common pattern and is too weak.")
        return value

    def validate_avatar(self, avatar):
        try:
            img = Image.open(avatar)
            img.verify()
            if img.format not in ['JPEG', 'PNG']:
                raise serializers.ValidationError("Seuls les formats JPEG et PNG sont autorisés.")
            img = Image.open(avatar)
            img.load()
        except (IOError, ValidationError):
            raise serializers.ValidationError("Le fichier de l'avatar doit être une image valide.")
        return avatar

    @staticmethod
    def get_file_extension(filename):
        return filename.split('.')[-1].lower()

    def update(self, instance, validated_data):
        validated_data.pop('password', None)
        validated_data.pop('confirm_password', None)
        new_avatar = validated_data.pop('avatar', None)

        if new_avatar is not None:
            if instance.avatar.name != 'default.png' and default_storage.exists(instance.avatar.path):
                default_storage.delete(instance.avatar.path)

            ext = self.get_file_extension(new_avatar.name)
            new_filename = f"avatars/user{instance.id:02d}.{ext}"
            new_avatar.name = new_filename
            instance.avatar = new_avatar

        new_password = validated_data.pop('new_password', None)
        if new_password:
            instance.set_password(new_password)

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
                'min_length': 8,
                'max_length': 128,
                'label': 'Password'
            },
            'confirm_password': {
                'write_only': True,
                'label': 'Confirm password'
            },
        }

    def validate_password(self, value):
        """
        Validate that the password meets security requirements.
        """
        # Check for at least one uppercase letter
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        # Check for at least one lowercase letter
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        
        # Check for at least one digit
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        
        # Check for at least one special character
        special_chars = "!@#$%^&*()-_=+[]{}|;:'\",.<>/?"
        if not any(char in special_chars for char in value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        
        # Check that password doesn't contain common patterns
        common_patterns = ['password', '123456', 'qwerty', 'admin']
        if any(pattern in value.lower() for pattern in common_patterns):
            raise serializers.ValidationError("Password contains a common pattern and is too weak.")
        
        return value

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

    class Meta:
        model = Game
        fields = ['id', 'result', 'player1', 'player2', 'score_player1', 'score_player2', 'date', 'tournament']

    def get_result(self, obj):
        """
        Détermine si l'utilisateur ciblé par la requête a gagné ou perdu la partie,
        selon le profil consulté.
        """
        target_user = self.context.get('target_user')

        # Si le joueur cible est player1
        if target_user == obj.player1:
            return "Victoire" if obj.score_player1 > obj.score_player2 else "Defaite"
        # Si le joueur cible est player2
        elif target_user == obj.player2:
            return "Victoire" if obj.score_player2 > obj.score_player1 else "Defaite"

    def get_tournament(self, obj):
        """
        Vérifie si la partie est liée à un tournoi.
        """
        return obj.tournament is not None
