from django.db import models

# Create your models here.

class User(models.Model):
    class Mode(models.TextChoices):
        OFFLINE = 'Offline', 'offline'
        ONLINE = 'Online', 'online'
    name = models.CharField()
    mail = models.CharField()
    password = models.CharField()
    mode = models.CharField(choices=Mode.choices, default=Mode.OFFLINE)
    play = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Salon(models.Model):
    player = models.ManyToManyField("User", blank=True)
    score1 = models.IntegerField(blank=True, null=True)
    score2 = models.IntegerField(blank=True, null=True)

class Mode(models.Model):
    class Mode(models.TextChoices):
        soloq = '2P', 'soloq'
        TOURNAMENT = '4P', 'tournament'
    mode = models.CharField(choices=Mode)
    salon = models.ManyToManyField("Salon", blank=True)