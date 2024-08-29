from django.db import models

class User(models.Model):
    name = models.CharField()
    mail = models.IntegerField()
    password = models.DateField()

    def __str__(self):
        return self.title