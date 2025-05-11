import asyncio
import json
from .Player import Player

class Guest(Player):
    def __init__(self):
        self.hosts = {}
        self.accepted = False
        super().__init__()

    def __str__(self):
        return (f'Guest {self.user_id} type_game: {self.type_game}')
    
    async def start_1vs1RtoFront(self, id):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': id,
            },
            'body':{
                'status': 'pending',
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

    
    

