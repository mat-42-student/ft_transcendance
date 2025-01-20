import json
class Ex_consumer():
	def __init__(self, data):
		self.user_id = None
		self.json_data = data
	
	def parsing_of_JSONclient(self):
		print(self.json_data)
		self.json_data = json.loads(self.json_data.get('data'))
		self.id = self.json_data['header']['id'] 
		print(f'{self.id}')
	
	def get_id():
		return (self.id)

	def __str__(self):
		return (f'Ex_consumer {self.id} : \t data: {self.json_data}')




async def return_id_from_the_json(some_data):
	return some_data['header']['id']


async def matchmaking(msg_from_somoene):
	dict_from_client = json.loads(msg_from_somoene.get('data'))
	n = Ex_consumer(msg_from_somoene)
	n.parsing_of_JSONclient()
	id = await return_id_from_the_json(dict_from_client)
	return ({id: n})