from django.db import models

# class User(models.Model):
# 	name = models.CharField()
# 	mail = models.CharField()
# 	password = models.CharField()
# 	play = models.BooleanField(default=False)
	
# 	def __str__(self):
# 		return self.name

# 	class Meta:
# 		db_table = 'user'

# class Messages(models.Model):
# 	dest = models.ForeignKey(User, blank=True, null=True, on_delete=models.CASCADE)
# 	exp = models.ForeignKey(User, blank=True, null=True, on_delete=models.CASCADE)
# 	message = models.CharField(max_length=100)

# 	class Meta:
# 		db_table = 'messages'
