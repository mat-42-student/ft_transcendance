import json
class Player ():
	def __init__(self):
		self.user_id = None
		self.type_game = None
		self.status = None
	
	def get_id(self):
		return (self.user_id)

	def __str__(self):
		return (f'Player {self.user_id} : status: {self.status}')
