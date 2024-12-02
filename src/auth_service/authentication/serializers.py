from rest_framework import serializers
from .models import CustomUser
    
class UserSerializer(serializers.ModelSerializer):
    class Meta(object):
        model = CustomUser
        fields = ('id', 'username', 'password', 'email', 'nickname', 'avatar', 'wins', 'losses', 'otp', 'otp_expiry_time')
        extra_kwargs = {
            'password': {'write_only':True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance
