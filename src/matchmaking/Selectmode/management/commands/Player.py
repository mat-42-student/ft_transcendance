import json
import requests
import asyncio
#from .Guest import Guest

class Player ():
    def __init__(self):
        self.user_id = None
        self.token = None
        self.username = None
        self.type_game = None
        self.guests = {}
        self.cancel = False
    
    def get_id(self):
        return (self.user_id)
    
   # def setUser(self):
    
    def getDict(self):
        player = {
            'user_id': self.user_id,
            'username': self.username,
            'type_game': self.type_game
        }
        return (player)
        
    def __str__(self):
        return (f'Player {self.user_id}')
    
    def get_user(self):
        """Get information to API user and set this in instances"""
        url = f"http://users:8000/api/v1/users/{self.user_id}/"  # Remplace par ton URL réelle

        headers = {
            "Authorization": f"Bearer {self.token}",  # Ajoute le token d'authentification
            "Content-Type": "application/json",  # Optionnel, selon ton API
        }

        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json() # Renvoie les données au format JSON
            print(data)
            self.username = data.get('username')
            self.picture = data.get('avatar')
        else:
            print("error: User not found")
    
    async def checkStatus(self, redis, channel):
        test = 5
        data = {
            'user_id': self.user_id
        }
        print(data)
        status = None
        await redis.publish(channel, json.dumps(data))
        while (status is None and test >= 0):
            try:
                status = await redis.get(f'user_{self.user_id}_status')
                print(f'GET status = {status}')
                if (status is not None):
                    return (status)
            except asyncio.TimeoutError:
                print("Timeout atteint lors de l'attente de Redis.")
            await asyncio.sleep(0.5)
            test -= 1
    
    def invitation(self, message):
        invite = message['body']['invite']
        if (invite.get('guest_id') is not None):
            # Research guest_id, verify this status and friendship then send invitation
            if (self.check_statusPlayer(invite.get('user_id'))):
                print(f'{invite}')
        elif (invite.get('host_id') is not None):
            # Research host_id to send the response by guest_id
            print(f'{invite}')
            
    async def updateStatus(self, redis, channel, status):
        data = {
            'header':{
                'service': 'social',
                'dest': 'back',
                'id': self.user_id,
            },
            'body':{
                'status': status,
            }
        }
        await redis.publish(channel, json.dumps(data))
    
