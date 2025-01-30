import asyncio
import json
from .Salon import Salon
import itertools

class Random1vs1():
    def __init__(self, redis, channelFront, channelSocial):
        self.players = {}
        self.salons = {}
        self.game = []
        self.event = asyncio.Event()
        self.redis = redis
        self.channelFront = channelFront
        self.channelSocial = channelSocial

    async def add(self, key, value): # Add Players and check if we have 2 Players
        """Ajoute un élément au dictionnaire et à la file d'attente."""
        self.players.update({key: value})
        if (len(self.players) > 1): # check if players > 1 to create Salon(game)
            self.event.set()  # Déclenche l'événement
        
    async def monitor(self): # Create a game if we have 2 players in tab players is launch like async_task
        print("Surveille l'événement et traite les nouveaux ajouts.")
        while True:
            await self.event.wait()  # Wait event is set
            
            
            print("Detected new additions!")
            salon = Salon() # create a game because Players > 1
            for key, value in itertools.islice(self.players.items(), 2): # Just need 2 Players 
                
                salon.players.update({key: value}) # add to players of Salon
                await self.start_1vs1RtoFront(value)
                salon.type_game = "1vs1R" # define the type_game
                self.game.append(salon) # add the salon to game
            
            self.players.clear() # Clear tab Players to recreate salon
            self.event.clear()  # Réinitialise l'événement pour détecter les prochains ajouts
            await asyncio.sleep(1)


    async def start_1vs1RtoFront(self, player):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': player.user_id,
            },
            'body':{
                'status': 'ingame',
            }
        }
        await self.redis.publish(self.channelFront, json.dumps(data))

    async def start_1vs1RtoSocial(self, player):
        data = {
            'header':{
                'service': 'social',
                'dest': 'back',
                'id': player.user_id,
            },
            'body':{
                'status': 'ingame',
            }
        }
        await self.redis.publish(self.channelSocial, json.dumps(data))