from rest_framework import serializers
from Selectmode.models import User

class UserSerializer(serializers.ModelSerializer):

    mode = serializers.ChoiceField(choices=User.Mode.choices)

    class Meta:
        model = User
        fields =  "__all__"