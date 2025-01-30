from django.core.management.base import BaseCommand
from redis.asyncio import from_url
import json
import asyncio
import time
from .matchmaking import Player
from .Salon import Salon
from .Random1vs1 import Random1vs1
from asyncio import run as arun, sleep as asleep, create_task
from signal import signal, SIGTERM, SIGINT

class Command(BaseCommand):
    help = "Commande pour écouter un canal Redis avec Pub/Sub"   

    def handle(self, *args, **kwargs):
        signal(SIGINT, self.signal_handler)
        signal(SIGTERM, self.signal_handler)
        arun(self.main())

    async def main(self):
        self.running = True
        try:
            self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            self.channel_front = "deep_mmaking"
            self.channel_social = "info_social"
            self.random1vs1 = Random1vs1(self.redis_client, self.channel_front, self.channel_social)
            self.tournament = {}
            self.invite = {}
            self.message = None
            print(f"Subscribing to channel: {self.channel_front}")
            await self.pubsub.subscribe(self.channel_front)
            await self.pubsub.subscribe(self.channel_social)
            self.listen_task = create_task(self.listen())
            self.random1vs1_task = create_task(self.random1vs1.monitor())

            while self.running:
                await asleep(1)
        except Exception as e:
            print(e)
        finally:
            await self.cleanup_redis()

    async def listen(self):

        print("Listening for messages...")
        async for msg in self.pubsub.listen():
            if msg : #and msg['type'] == 'message':  # Filtre uniquement les messages réels

                try:
                    print(msg)
  
                    if (msg.get('channel') != self.channel_social): # Do nothing if msg is send on info_social
                        message = json.loads(msg.get('data'))
                        newPlayer = Player()
                        verif =  await self.verifConditions(message, newPlayer)
                        if(not verif):
                            await self.SelectTypeGame(message, newPlayer)
                        
                        print("listen again...")
                except Exception as e:
                    print(e)

    
    def signal_handler(self, sig, frame):
        try:
            self.listen_task.cancel()
            self.random1vs1.cancel()
        except Exception as e:
            print(e)
        self.running = False

    async def cleanup_redis(self):
        print("Cleaning up Redis connections...")
        if self.pubsub:
            await self.pubsub.unsubscribe(self.channel_front)
            await self.pubsub.unsubscribe(self.channel_social)
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()

    async def check_statusPlayer(self, message):
        header = message['header']
        data = {
            'user_id': header['id']
        }
        await self.redis_client.publish(self.channel_social, json.dumps(data))
        # await asleep(0.5)
        try:
            status = await self.redis_client.get(header['id'])
            if (status is not None):
                return (status)
        except asyncio.TimeoutError:
            print("Timeout atteint lors de l'attente de Redis.")
        
        return None

    async def setup_statusPlayer(self, message, player):
        header = message['header']
        data = {
            'header':{
                'service': 'social',
                'dest': 'back',
                'id': header['id'],
            },
            'body':{
                'status': 'pending',
                'status': 'test'
            }
        }
        player.status = 'pending'
        await self.redis_client.publish(self.channel_front, json.dumps(data))

    async def verifConditions(self, message, newPlayer):
        # Check the content of body
        if (message.get('body') and message['body'].get('type_game')):
            print(f'Check get body and type_game is true')
            # Check the status of Player
            if (await self.check_statusPlayer(message) == 'online'):
                await self.setup_statusPlayer(message, newPlayer)
                print(f'{newPlayer}')
                return (True)
        return (False)

    # Research and verify conditions for the type_game selected
    async def SelectTypeGame(self, data, player):
        header = data['header']
        body = data['body']
        if (body.get('type_game') == '1vs1R'): # 1vs1R
            player.user_id = header['id']
            await self.random1vs1.add(player.user_id, player)
            if (len(self.random1vs1.players) > 1):
                await self.random1vs1.event.wait()
            print(f'{player}')
        elif (body.get('type_game') == 'invite'): # Invite
            invite = body.get['type_game']['invite']
            if (invite.get('guest_id') is not None):
                # Research guest_id, verify this status and send invitation
                print(f'{invite}')
            elif (invite.get('host_id') is not None):
                # Research host_id to send the response by guest_id
                print(f'{invite}')
        elif (body.get('type_game') == 'tournament'):
            # Research Player with opponents < 4 and the type_game is tournament
            print(f'tournament')
        print("End SelectGame")

            
