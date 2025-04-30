import json
import requests
import asyncio
from django.core.cache import cache
from django.conf import settings
#from .Guest import Guest
import jwt
import logging

from datetime import datetime, timedelta, timezone



class Player ():
    def __init__(self):
        self.user_id = None
        self.username = None
        self.type_game = None
        self.guests = {}
        self.socketGame_is_online = None
        self.leave_game = False
    
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
        """Get information from API user and set this in instances"""

        payload = {
            "service": "matchmaking",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=120),
        }
        
        token = jwt.encode(
            payload,
            settings.BACKEND_JWT["PRIVATE_KEY"],
            algorithm=settings.BACKEND_JWT["ALGORITHM"],
        )

        url = f"https://nginx:8443/api/v1/users/{self.user_id}/"
        headers = {"Authorization": f"Service {token}"}

        response = requests.get(
            url,
            headers=headers,
            timeout=10,
            cert=("/etc/ssl/matchmaking.crt", "/etc/ssl/matchmaking.key"),
            verify="/etc/ssl/ca.crt"
        )

        if response.status_code == 200:
            data = response.json()
            print(data)
            self.username = data.get('username')
            self.picture = data.get('avatar')
        else:
            print("error: User not found")
    
    async def getStatus(self, redis, channel):
        test = 5
        data = {
            'user_id': self.user_id
        }
        status = None
        print(data)
        await redis.publish(channel, json.dumps(data))
        while (status is None and test >= 0):
            try:
                status = await redis.get(f'user_{self.user_id}_status')
                print(f'GET status = {status}')
                if (status is not None):
                    await redis.delete(f'user_{self.user_id}_status')
                    return (status)
            except asyncio.TimeoutError:
                print("Timeout atteint lors de l'attente de Redis.")
                return None
            await asyncio.sleep(0.2)
            test -= 1
        return None
    
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
        print(f'Now player {self.user_id} is {status}')
        data = {
            'header':{
                'service': 'social',
                'dest': 'back',
                'id': self.user_id,
            },
            'body':{
                'status': status,
                'from': 'mmaking' # mdjemaa
            }
        }
        await redis.publish(channel, json.dumps(data))

    def get_friend_list(self):
        """ Request friendlist from container 'users' """
        try:
            payload = {
                "service": "social",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=120),
            }
            
            token = jwt.encode(
                payload,
                settings.BACKEND_JWT["PRIVATE_KEY"],
                algorithm=settings.BACKEND_JWT["ALGORITHM"],
            )

            url = f"https://nginx:8443/api/v1/users/{self.user_id}/friends/"
            headers = {"Authorization": f"Service {token}"}

            response = requests.get(
                url,
                headers=headers,
                timeout=10,
                cert=("/etc/ssl/matchmaking.crt", "/etc/ssl/matchmaking.key"),
                verify="/etc/ssl/ca.crt"
            )

            response.raise_for_status()
            data = response.json()

            return data.get('friends')

        except jwt.exceptions.PyJWTError as e:
            print(f"JWT Error: {e}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
        except ValueError as e:
            print(f"JSON decode error: {e}")
            return None
    
