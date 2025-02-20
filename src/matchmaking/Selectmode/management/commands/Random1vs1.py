import asyncio
import json
from .Salon import Salon
from .Player import Player
import itertools

class Random1vs1():
    def __init__(self, redis, channelFront, channelSocial):
        self.salon = None
        self.game = []
        self.redis = redis
        self.channelFront = channelFront
        self.channelSocial = channelSocial

    def add_1vs1R(self, key, value): # Add Players and check if we have 2 Players
        """Ajoute un Salon et à la file d'attente."""
        createNewSalon = True
        completed = False
        if (self.salon and len(self.salon.players) < 2 and self.salon.type_game == '1vs1R'):
            print("ADD player")
            self.salon.players.update({key: value})
            if (len(self.salon.players) >= 2):
                completed = True
            createNewSalon = False
        
        if (createNewSalon):
            print("CREATE new Salon")
            self.salon = Salon()
            self.salon.type_game = '1vs1R'
            self.salon.players.update({key: value})
        return (completed)
        
    async def monitor_1vs1R(self, player): # Create a game if we have 2 players in tab players is launch like async_task
        player.type_game = '1vs1R'
        player.get_user()
        completed = self.add_1vs1R(player.user_id, player)
        if (not completed):
            return
        for key in self.salon.players:
            await self.start_1vs1RtoFront(key)
            await self.start_1vs1RtoSocial(key)


    async def start_1vs1RtoFront(self, id):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': id,
            },
            'body':{
                'status': 'ingame',
            }
        }
        data['body']['opponents'] = self.salon.getDictPlayers()
        del data['body']['opponents'][id]
        await self.redis.publish(self.channelFront, json.dumps(data))

    async def start_1vs1RtoSocial(self, id):
        data = {
            'header':{
                'service': 'social',
                'dest': 'back',
                'id': id,
            },
            'body':{
                'status': 'ingame',
            }
        }
        await self.redis.publish(self.channelSocial, json.dumps(data))