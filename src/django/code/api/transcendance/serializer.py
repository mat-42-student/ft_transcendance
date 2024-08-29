from rest_framework import serializers
from transcendance.models import User

class UserSerializer(serializers.Serializer):

    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    mail = serializers.IntegerField()
    password = serializers.DateField()

    