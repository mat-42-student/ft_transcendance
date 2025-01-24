import json
class Player():
	def __init__(self, data):
		self.user_id = null
		self.type_game = null
	
	def setdataPlayer(mode, hostid, ):
		self.json_data = json.loads(self.json_data.get('data'))
		self.id = self.json_data['header']['id']
	
	def get_id():
		return (self.id)

	def __str__(self):
		return (f'Player {self.id} : {self.json_data}')




async def return_id_from_the_json(some_data):
	return some_data['header']['id']


async def matchmaking(msg_from_somoene):
	dict_from_client = json.loads(msg_from_somoene.get('data'))
	newPlayer = Player(msg_from_somoene)
	newPlayer.setdataPlayer()
	id = await return_id_from_the_json(dict_from_client)
	return ({id: newPlayer})