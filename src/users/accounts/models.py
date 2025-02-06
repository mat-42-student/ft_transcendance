from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator

# class UserManager(BaseUserManager):
#     def create_user(self, username, password=None, **extra_fields):
#         if not username:
#             raise ValueError('Le champ username ne peut pas être vide')
#         user = self.model(username=username, **extra_fields)
#         user.set_password(password)
#         user.save(using=self._db)
#         return user

#     def create_superuser(self, username, password=None, **extra_fields):
#         extra_fields.setdefault('is_staff', True)
#         extra_fields.setdefault('is_superuser', True)
#         return self.create_user(username, password, **extra_fields)
    
#     class Meta:
#         db_table = 'user_manager'

class UserManager(BaseUserManager):
    def create_user(self, email, username=None, password=None, **extra_fields):
        """
        Creates and saves a User with the given email.
        If username is not provided, it is generated (e.g., from the email).
        If no password is provided (as in an OAuth registration), an unusable password is set.
        """
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        
        # Generate a username if one is not provided
        if not username:
            username = email.split('@')[0]
            # Optionally, add logic here to ensure the username is unique.
        
        user = self.model(email=email, username=username, **extra_fields)
        
        if password:
            user.set_password(password)  # This properly hashes the password.
        else:
            user.set_unusable_password()  # This disables password-based login.
        
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password, **extra_fields):
        """
        Creates and saves a superuser.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if not password:
            raise ValueError('Superusers must have a password.')
        
        return self.create_user(email, username, password, **extra_fields)

    
# User model (inherits Django user model)
class User(AbstractBaseUser):
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('in_game', 'In Game'),
    ]
    
    username = models.CharField(
        max_length=50, 
        unique=True,
        validators=[MinLengthValidator(3)],
        blank=True
    )
    email = models.EmailField(
        max_length=254,
        unique=True,
    )
    avatar = models.ImageField(
        upload_to="avatars/", 
        default='default.png'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='offline'
    )
    blocked_users = models.ManyToManyField(
        'self', 
        symmetrical=False, 
        blank=True, 
        related_name='blocked_by',
        through='BlockedUser'
    )
    is_2fa_enabled = models.BooleanField(
        default=False
    )
    totp_secret = models.CharField(
        max_length=32,
        null=True,
        blank=True
    )
    
    # Standard Django auth fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = UserManager()

    # Use email as the unique identifier for authentication.
    USERNAME_FIELD = "email"
    # When creating a superuser using Django’s CLI, it will prompt for a username.
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.username or self.email

    class Meta:
        db_table = 'users'
    
# BlockedUser model -> personnalisé pour gérer indexation dans db (améliore perf)
class BlockedUser(models.Model):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocking',
        db_index=True  # Ajout de l'index sur la clé étrangère
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked',
        db_index=True  # Ajout de l'index sur la clé étrangère
    )
    blocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blocked_users'
        unique_together = ('from_user', 'to_user')

# Relationship model
class Relationship(models.Model):
    PENDING = 'pending'
    FRIEND = 'friend'
    NONE = 'none'

    RELATIONSHIP_CHOICES = [
        (PENDING, 'Pending'),
        (FRIEND, 'Friend'),
        (NONE, 'None'),
    ]

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='relationships_initiated'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='relationships_received'
    )
    status = models.CharField(
        max_length=10,
        choices=RELATIONSHIP_CHOICES,
        default=NONE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'relationship'
        unique_together = ('from_user', 'to_user')

    def clean(self):
        if self.from_user == self.to_user:
            raise ValidationError("Un utilisateur ne peut pas avoir de relation avec lui-même.")

    def __str__(self):
        return f"{self.from_user.username} -> {self.to_user.username} ({self.status})"