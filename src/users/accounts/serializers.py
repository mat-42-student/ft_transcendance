from rest_framework import serializers

from django.contrib.auth.hashers import check_password
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError

from PIL import Image

from .models import User, Relationship


# User 'list' serializer
class UserListSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'status', 'avatar']
        read_only_fields = ['id', 'username', 'status', 'avatar']

    def get_avatar(self, obj):
        return obj.avatar.name.split('/')[-1] if obj.avatar else "default.png"


# User 'retrieve' serializer
class UserDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'status', 'avatar']
        read_only_fields = ['id', 'username', 'status', 'avatar']

    def get_avatar(self, obj):
        return obj.avatar.name.split('/')[-1] if obj.avatar else "default.png"


# User private 'retrieve' serializer
class UserPrivateDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'status', 'avatar', 'blocked_users']
        read_only_fields = ['id', 'username', 'status', 'avatar', 'blocked_users']

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
    confirm_password = serializers.CharField(write_only=True)

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
        password = data.get('confirm_password')
        new_password = data.get('password')
        if password and not new_password:
            raise serializers.ValidationError({"password": "Veuillez spécifier un nouveau mot de passe pour le mettre à jour."})
        if new_password and not password:
            raise serializers.ValidationError({"confirm_password": "Le mot de passe actuel est obligatoire pour effectuer des modifications."})
        if password and not user.check_password(password):
            raise serializers.ValidationError({"confirm_password": "Le mot de passe actuel est incorrect."})
        
        # Vérification de l'avatar si fourni
        if 'avatar' in data:
            data['avatar'] = self.validate_avatar(data['avatar'])

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
        fields = ['username', 'password', 'confirm_password']
        extra_kwargs = {
            'username': {
                'min_length': 3, 
                'max_length': 50,
                'label': 'Nom d’utilisateur'
            },
            'password': {
                'write_only': True,
                'min_length': 5,
                'max_length': 128,
                'label': 'Mot de passe'
            },
            'confirm_password': {
                'write_only': True,
                'label': 'Confirmez mot de passe'
            },
        }

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
            # Ne pas accepter `is_staff` ou `is_superuser` dans les données
        if 'is_staff' in data or 'is_superuser' in data:
            raise serializers.ValidationError("La création d'un super utilisateur est interdite via cette API.")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')  # Supprime `confirm_password` des données validées
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        user.save()
        return user


# User login serializer
class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        try:
            user = User.objects.get(username=data['username'])
            if not user.check_password(data['password']):
                raise serializers.ValidationError("Mot de passe incorrect.")
        except User.DoesNotExist:
            raise serializers.ValidationError("Utilisateur non trouvé.")
        return data


# Relationship 'detail' serializer
class RelationshipSerializer(serializers.ModelSerializer):
    from_user = serializers.StringRelatedField()
    to_user = serializers.StringRelatedField()

    class Meta:
        model = Relationship
        fields = ['from_user', 'to_user', 'status', 'created_at']


# User Relationship 'list' serializer
class UserRelationshipsSerializer(serializers.Serializer):
    friends = RelationshipSerializer(many=True)
    sent_requests = RelationshipSerializer(many=True)
    received_requests = RelationshipSerializer(many=True)