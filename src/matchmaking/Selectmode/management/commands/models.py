from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator

# User model manager
class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('Le champ username ne peut pas être vide')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, password, **extra_fields)
    
    class Meta:
        db_table = 'user_manager'
    
# User model (inherits Django user model) -> Ajouter: bio, tableaux historique 1à dernières games ???
class User(AbstractBaseUser):
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('in_game', 'In Game'),
    ]
    
    username = models.CharField(
        max_length=50,
        unique=True,
        validators=[MinLengthValidator(3)]
    )
    password = models.CharField( # Utilisation d'un mot de passe hashé -> SUPPRIMER pour laisser django gérer hashage ou utiliser set_password()
        max_length=128, 
        validators=[MinLengthValidator(5)]
    )
    email = models.EmailField(
        max_length=254,
        blank=True,
        null=True,
        unique=True,
    )
    avatar = models.ImageField(
        upload_to="avatars/", 
        default='avatars/default.png'
    )
    # status à changer/supprimer -> gestion status via ws dans front
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
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )
    
    # Champs d'authentification standard de Django
    is_active = models.BooleanField(
        default=True
    )
    is_staff = models.BooleanField(
        default=False
    )
    is_superuser = models.BooleanField(
        default=False
    )

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['password', 'email']

    def __str__(self):
        return self.username

    class Meta:
        db_table = 'users'

# ft42Profile model
class Ft42Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ft42_profile')

    ft_id = models.IntegerField(
        unique=True
    )
    access_token = models.CharField(
        max_length=255, blank=True, null=True
    )
    refresh_token = models.CharField(
        max_length=255, blank=True, null=True
    )
    login = models.CharField(
        max_length=100, blank=True
    )
    email = models.EmailField(
        blank=True, null=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.user.username} - 42 ID: {self.ft_id}"

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
    

# Choices for game rounds
ROUND_CHOICES = [
    ("friendly", "Friendly Match"),
    ("ranked", "Ranked"),
    ("first_round", "First Round"),
    ("quarter_final", "Quarter-Final"),
    ("semi_final", "Semi-Final"),
    ("final", "Final"),
]

# Game type choices (tournament or friendly)
GAME_TYPE_CHOICES = [
    ("friendly", "Friendly Match"),
    ("ranked", "Ranked"),
    ("tournament", "Tournament Game"),
]

class Tournament(models.Model):
    name = models.CharField(max_length=255, blank=True, null=True)
    round_max = models.IntegerField(default=2)
    location = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField(auto_now=True)
    organizer = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name="organized_tournaments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Tournament'

    def __str__(self):
        return self.name

class Game(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, blank=True, related_name="games")
    player1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="games_as_player1")
    player2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="games_as_player2")
    score_player1 = models.IntegerField(default=0)
    score_player2 = models.IntegerField(default=0)
    date = models.DateTimeField()
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="won_games")
    round = models.IntegerField(default=1)
    game_type = models.CharField(max_length=20, choices=GAME_TYPE_CHOICES, default="friendly")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Game'

    def __str__(self):
        if self.tournament:
            return f"{self.round}: {self.player1.username} vs {self.player2.username} - {self.tournament.name}"
        return f"Friendly {self.id}: {self.player1.username} vs {self.player2.username}"
