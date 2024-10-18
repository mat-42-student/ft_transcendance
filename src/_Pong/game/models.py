from django.db import models
from django.contrib.auth.models import User

class Salon(models.Model):
    player = models.ManyToManyField(User, blank=True)
    score1 = models.IntegerField(blank=True, null=True)
    score2 = models.IntegerField(blank=True, null=True)
    winner = models.CharField(blank=True, null=True)