from rest_framework import serializers
from django.contrib.auth.hashers import check_password
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError
from django.utils.html import escape
from django.core.validators import RegexValidator
from django.utils.html import strip_tags
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from PIL import Image

from .models import User, Relationship, Game, Tournament

class PasswordValidationSerializer(serializers.Serializer):
    password = serializers.CharField()

    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe incorrect.")
        return value

# User registration serializer
class UserRegistrationSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    username = serializers.CharField(
        validators=[
            RegexValidator(
                regex=r'^[\w.@+-]+$',
                message="Username may only contain letters, numbers, and @/./+/-/_ characters."
            )
        ],
        min_length=2,
        max_length=50,
        error_messages={
            'unique': 'Username is already taken.'
        }
    )

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

    def validate_username(self, value):
        sanitized_value = escape(value)
        if sanitized_value != value:
            raise serializers.ValidationError("Username contains invalid characters.")
        return sanitized_value

    def validate_email(self, value):
        clean_value = strip_tags(value).strip()
        if clean_value != value:
            raise serializers.ValidationError("Email contains invalid characters.")
        return clean_value.lower()

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
        if 'is_staff' in data or 'is_superuser' in data:
            raise serializers.ValidationError("The creation of a super user is prohibited via this API.")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email']
        )
        user.save()
        return user


# User 'list' serializer (searchbar engine)
class UserListSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = ['id', 'username']

class UserDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'is_2fa_enabled']
        read_only_fields = ['id', 'username', 'avatar', 'is_2fa_enabled']

    def get_avatar(self, obj):
        return obj.avatar.url if obj.avatar else "/media/default.png"
    

class UserPrivateDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'is_2fa_enabled', 'blocked_users']
        read_only_fields = ['id', 'username', 'avatar', 'is_2fa_enabled', 'blocked_users']

    def get_avatar(self, obj):
        return obj.avatar.url if obj.avatar else "/media/default.png"


class UserMinimalSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar']
        read_only_fields = ['id', 'username', 'avatar']

    def get_avatar(self, obj):
        return obj.avatar.url if obj.avatar else "/media/default.png"
    

class UserMicroSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id']
        read_only_fields = ['id']


class UserBlockedSerializer(serializers.ModelSerializer):
    message = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['username', 'avatar', 'message']

    def get_avatar(self, obj):
        return obj.avatar.url if obj.avatar else "/media/default.png"

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
            raise serializers.ValidationError("Empty form detected. Please provide the necessary information.")
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

        # Password policy
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
        max_size_mb = 5
        try:
            img = Image.open(avatar)
            img.verify()

            if img.format.lower() not in ['jpeg', 'jpg', 'png']:
                raise serializers.ValidationError("Seuls les formats JPEG et PNG sont autorisés.")
            
            if avatar.size > max_size_mb * 1024 * 1024:
                raise serializers.ValidationError(f"Image size must be under {max_size_mb}MB.")
            
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
        Determines if the user targeted by the request has won or lost the game,
        based on the profile being viewed.
        """
        target_user = self.context.get('target_user')

        if target_user == obj.player1:
            return "Victoire" if obj.score_player1 > obj.score_player2 else "Defaite"
        elif target_user == obj.player2:
            return "Victoire" if obj.score_player2 > obj.score_player1 else "Defaite"

    def get_tournament(self, obj):
        """
        Checks if the game is linked to a tournament.
        """
        return obj.tournament is not None
