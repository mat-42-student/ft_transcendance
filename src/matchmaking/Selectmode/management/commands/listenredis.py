from django.core.management.base import BaseCommand
from redis.asyncio import from_url
import json
import asyncio
import time
from asyncio import run as arun, sleep as asleep, create_task
from signal import signal, SIGTERM, SIGINT
from django.conf import settings
import requests

# Custom Class
from .Player import Player
from .Salon import Salon
from .Guest import Guest
from .Random1vs1 import Random1vs1



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
            
            # All channels
            self.channel_front = "deep_mmaking"
            self.channel_social = "info_social"
            self.channel_deepSocial = "deep_social"
            
            # Data to save all salon by the type_game
            self.salons = {
                "1vs1R": [],
                "invite": [],
                "tournament":[]
            }
            
             # Data to save all game by the type_game
            self.game = {
                "1vs1R": [],
                "invite": [],
                "tournament": []
            }
            
            # Global dict
            self.players = {}
            self.tournament = {}
            self.invite = {} # dict with host_id key and host_player value
            self.message = None
            
            # Subscribe all channels
            await self.pubsub.subscribe(self.channel_front)
            await self.pubsub.subscribe(self.channel_social)
            
            # Create task to listen msg
            self.listen_task = create_task(self.listen())

            while self.running:
                await asleep(1)
        except Exception as e:
            print(e)
        finally:
            await self.cleanup_redis()

    async def listen(self):

        print("Listening for messages...")
        async for msg in self.pubsub.listen():
            if msg :

                try:
                    if (msg.get('channel') != self.channel_social): # Do nothing if msg is send on info_social
                        message = json.loads(msg.get('data'))
                        await self.SelectTypeGame(message)
                        
                        print("listen again...")
                except Exception as e:
                    print(e)

    # Kill task
    def signal_handler(self, sig, frame):
        try:
            self.listen_task.cancel()
        except Exception as e:
            print(e)
        self.running = False

    # Clean all channels on redis and close redis
    async def cleanup_redis(self):
        print("Cleaning up Redis connections...")
        if self.pubsub:
            await self.pubsub.unsubscribe(self.channel_front)
            await self.pubsub.unsubscribe(self.channel_social)
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()
            
    
    # Create Player if he didn't already exist somewhere
    async def manage_player(self, header, body):
        player = Player()
        try:
            for type_salon in self.salons.values():
                for salon in type_salon:
                    already_player = False 
                    
                    # Find player in one Salon
                    if (salon.players.get(header.get('id'))):
                        already_player = salon.players.get(header.get('id'))
                        
                    # Check if player want give up the search or is disconnect
                    if (already_player and body.get('cancel') or body.get('disconnect')):
                        await already_player.updateStatus(self.redis_client, self.channel_deepSocial, "online")
                        self.deletePlayer(salon, already_player)
                        return False
                    
                    if (already_player):
                        return already_player
    
            player.user_id = header['id']
            player.type_game = body['type_game']
            return (player)
        except Exception as e:
            print(e)
    
    def deletePlayer(self, salon ,player):
        try:
            del salon.players[player.user_id]
        except Exception as e:
            print(e)
            

    # Research and verify conditions for the type_game selected
    async def SelectTypeGame(self, data):
        header = data['header']
        body = data['body']
        
        # Check if player already exist
        player = await self.manage_player(header, body)
        if (not player):
            return
        
        # Setup token to request endpoints api
        player.token = self.machine_token # TESTING CLIENT CREDENTIALS FLOW

        if (body.get('type_game') == '1vs1R'): # 1vs1R
            player.type_game = '1vs1R'
            await self.random(player)
        elif (body.get('type_game').get('invite')): # Invite
            player.type_game = 'invite'
            invite = body['type_game']['invite']
            await self.invitation(player, invite)
        elif (body.get('type_game') == 'tournament'):
            # Research Player with opponents < 4 and the type_game is tournament
            print(f'tournament')

            

    # Setup data to player (username, avatar), create and update salon then create game  
    async def random(self, player):
        """Setup data to player (username, avatar), create and update salon then create game """
        
        # Check the status for research random game
        if (await player.checkStatus(self.redis_client, self.channel_social) != 'online'):
            return 
        
        # Setup player
        player.get_user()
        
        # Create and update Salon
        salon = self.createSalonRandom(player.type_game)
        salon.players.update({player.user_id: player})
        salon.type_game = player.type_game
        
        # Create and update Game
        self.salons[player.type_game].append(salon)
        
        # Update status player with Social
        await player.updateStatus(self.redis_client, self.channel_deepSocial, 'pending')
        
        # Launch game if Salon has 2 players
        if (len(salon.players) >= 2):
            self.create_game(salon.type_game, salon)
            await self.send_1vs1R(salon)
        
    
    # Process to invite
    async def invitation(self, player, obj_invite):

        print("Invitation")
        # Check the frienship with endpoint
        # Check status player
        status = await player.checkStatus(self.redis_client, self.channel_social)
        if (status == 'ingame' and status is None):
            print(f"Player Status is Bad -> {status}")

        # Setup host
        player.get_user()

        # Receive the msg by Guest    
        if (obj_invite.get('host_id')):
            host_id = None
            try:
                host_id = int(obj_invite.get('host_id'))
            except Exception as e:
                print(e)
                return 

            # If guest accept invitation
            if (obj_invite.get('accept') == True):

                # Research salon of the host
                for salon in self.salons['invite']:
                    host = salon.players.get(host_id)
                    if (host):
                        # add guest in salon
                        salon.players.update({player.user_id: player})
                        print("Response by server to host")
                        await self.invitationGame(player, host, True)
                        await self.invitationGame(host, player, True)
                        
                

        # Receive the msg by Host
        elif (obj_invite.get('guest_id')):
            
            # Build Guest
            guest = Guest()
            guest.user_id = obj_invite['guest_id']

            # Check status guest
            status = await guest.checkStatus(self.redis_client, self.channel_social)
            if (status == 'ingame' or status is None):
                print(f"Guest Status is Bad -> {status}")

            # Add to dict of Host the guests
            player.guests.update({guest.user_id: guest})

            # Create salon or find it by the host
            salon = self.createSalonInvite(player.type_game, player)
            salon.players.update({player.user_id: player})

            # Send invitation to guest
            await self.invitationGame(guest, player, None)
            await self.confirmSendInvitationGame(player.user_id, guest.user_id, None)
        

    # Search or create a Salon, if players in Salon < 2 return it else create it
    def createSalonRandom(self, type_game):
        """Search or create a Salon, if players in Salon < 2 return it else create it"""
        mainSalon = Salon()
        for salon in self.salons[type_game]:
            if (len(salon.players) < 2):
                mainSalon = salon
                try:
                    self.salons[salon.type_game].remove(salon)
                except Exception as e:
                    print(e)
                break
        return (mainSalon)

    def createSalonInvite(self, type_game, host):
        """Search Salon belongs to host or create it, if players has not it"""
        mainSalon = Salon()
        for salon in self.salons[type_game]:
            if (salon.players.get(host.user_id)):
                return salon
        self.salons[type_game].append(mainSalon)
        return (self.salons[type_game][-1])
    
    def create_game(self, type_game, salon):
        # Create game in database with an id and send start game clients and set status
        self.game[type_game].append(salon)
       
        
        
    async def send_1vs1R(self, salon):
         for key, player in salon.players.items():
            await self.start_toFront(key, salon)
            await player.updateStatus(self.redis_client, self.channel_deepSocial, "ingame")
    
    # Send status ingame to Front to start a game with all opponents
    async def start_toFront(self, id, salon):
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
        data['body']['opponents'] = salon.getDictPlayers()
        del data['body']['opponents'][id]
        await self.redis_client.publish(self.channel_front, json.dumps(data))


    #############       INVITATION JSON     #############

    # Send invitation game to Client
    async def invitationGame(self, host, guest, accept):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': host.user_id,
            },
            'body':{
                'type_game': {
                    'invite':{
                        'host_id': guest.user_id,
                        'username': guest.username,
                        'accept': accept
                    }
                }
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))

    # Confirm to host the invitation is send to Guest
    async def confirmSendInvitationGame(self, hostid, guestid, accept):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': hostid,
            },
            'body':{
                'type_game': {
                    'invite':{
                        'guest_id': guestid,
                        'accept': accept,
                        'send': True
                    }
                }
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))

    #############       INVITATION JSON     #############

    # Send status ingame to Social to setup status in front
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
        await self.redis_client.publish(self.channel_social, json.dumps(data))
            
