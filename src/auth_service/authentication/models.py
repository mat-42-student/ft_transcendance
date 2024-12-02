from django.db import models
from django.contrib.auth.models import AbstractUser
import random
import datetime

class CustomUser(AbstractUser):
    otp = models.CharField(max_length=6, null=True, blank=True)
    otp_expiry_time = models.DateTimeField(blank=True, null=True)
    is_2fa_enabled = models.BooleanField(default=False)
    nickname = models.CharField(max_length=30, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)

    def generate_otp(self):
            self.otp = str(random.randint(100000, 999999))
            self.otp_expiry_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=1)
            self.save()

    def is_otp_expired(self):
            return self.otp_expiry_time and datetime.datetime.now(datetime.timezone.utc) > self.otp_expiry_time
