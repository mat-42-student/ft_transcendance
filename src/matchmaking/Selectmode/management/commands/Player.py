import json
import requests

class Player ():
    def __init__(self):
        self.user_id = None
        self.token = None
        self.username = None
        self.type_game = None
        self.status = None
        self.cancel = False
    
    def get_id(self):
        return (self.user_id)
    
   # def setUser(self):
    
    def getDict(self):
        player = {
            'user_id': self.user_id,
            'username': self.username,
            'type_game': self.type_game,
            'status': self.status
        }
        return (player)
        
    def __str__(self):
        return (f'Player {self.user_id} : status: {self.status}')
    
    def get_user(self):
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
    
