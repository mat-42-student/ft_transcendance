from django.core.management.base import BaseCommand
from redis.asyncio import from_url
import json
import asyncio
import time
from asyncio import run as arun, sleep as asleep, create_task
from signal import signal, SIGTERM, SIGINT
from .models import Game, Tournament, User
from asgiref.sync import sync_to_async
from datetime import datetime

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
            self.channel_pong = "info_mmaking"
            
            # Data to save all salon by the type_game
            self.salons = {
                "1vs1R": [],
                "invite": [],
                "tournament":[]
            }
            
             # Data to save all game by the type_game
            self.games = {
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
            await self.pubsub.subscribe(self.channel_pong)
            
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
                    message = json.loads(msg.get('data'))
                    if (msg.get('channel') == self.channel_front): # Do nothing if msg is send on info_social
                        print(message)
                        if (message.get('header').get('dest') == 'front'):
                            pass
                        else:
                            await self.SelectTypeGame(message)
                    elif (msg.get('channel') == self.channel_pong):
                        await self.infoGame(message)
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
                    if (already_player and (body.get('cancel') or body.get('disconnect'))):
                        await already_player.updateStatus(self.redis_client, self.channel_deepSocial, "online")
                        print(f'{salon} | {already_player}')
                        self.deletePlayer(salon, already_player)
                        return False
                    
                    if (already_player):
                        return already_player
    
            player.user_id = header['id']
            player.type_game = body['type_game']
            return (player)
        except Exception as e:
            print(e)
    
    # Delete player somewhere
    def deletePlayer(self, salon ,player):
        try:
            if (salon.type_game == 'invite'):
                print("Send all Guest the invitation is unvalible and destroy the salon and player")
            elif (salon.type_game == '1vs1R'):
                print("Just destroy the player")
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
        player.token = header['token']

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

        print(f'Salon invite length -> {len(self.salons['invite'])}')
        for salon in self.salons['invite']:
            print(f'Length of players : {len(salon.players)}')
            try:
                print(f"{salon}")
            except Exception as e:
                print(f'Exception print Salon -> {e}')
        # Check the frienship with endpoint
        # Check status player
        
        if (obj_invite.get('startgame')):
            if (await self.launchInviteGame(player)):
                return 
        status = await player.checkStatus(self.redis_client, self.channel_social)
        

        
        if (status != 'online' or status is None):
            try:
                guestid = int(obj_invite.get('guest_id'))
                await self.cancelInvitation(player.user_id, guestid)
            except Exception as e:
                print(e)
            return 

        # Setup host
        player.get_user()


        # Receive the msg by Guest    
        if (obj_invite.get('host_id')):
            print("process host_id")
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
                        
                        # Guest
                        for guestid in list(host.guests):
                            # Cancel invitation of other guests
                            if (guestid != player.user_id):
                                await self.cancelInvitation(guestid, host.user_id)
                                del host.guests[guestid]
                            # Add guest to salon by Host
                            else:
                                # Setup Guest
                                guest = host.guests[guestid]
                                guest.token = player.token
                                guest.get_user()
                                guest.type_game = 'invite'
                                salon.players.update({guestid: guest })
                                
                                # update status Guest
                                await guest.updateStatus(self.redis_client, self.channel_deepSocial, 'pending')
                                await self.invitationGameToGuest(guest, host, True)
                                
                        # Host
                        await host.updateStatus(self.redis_client, self.channel_deepSocial, 'pending')
                        print("Response by server to host")
                        await self.invitationGameToHost(host, player, True)
                        
            elif (obj_invite.get('accept') == False):
                # Research salon of the host
                for salon in self.salons['invite']:
                    try:
                        host = salon.players.get(host_id)
                        if (host):
                            del host.guests[player.user_id]
                    except Exception as e:
                        print(f'exception is raise {e}')
                await self.invitationGameToHost(host, player, False)
                        
                

        # Receive the msg by Host
        elif (obj_invite.get('guest_id')):
            print("process guest_id")
            # Build Guest
            guest = Guest()
            try:
                guest.user_id = int(obj_invite['guest_id'])
            except Exception as e:
                print(f'try conversion -> {e}')
                return
            

            print("process guest_id")
            
            # Check status guest
            status = await guest.checkStatus(self.redis_client, self.channel_social)
            if (status != 'online' or status is None):
                print(f"Guest Status is Bad -> {status}")
                await self.cancelInvitation(player.user_id, guest.user_id)
                return 

            # Add to dict of Host the guests
            player.guests.update({guest.user_id: guest})

            # Create salon or find it by the host
            salon = self.createSalonInvite(player.type_game, player)
            if (salon is not None):
                salon.players.update({player.user_id: player})
            else:
                return
            
            # update player
            #await player.updateStatus(self.redis_client, self.channel_deepSocial, 'pending')

            # Send invitation to guest
            await self.invitationGameToGuest(guest, player, None)
            await self.confirmSendInvitationGame(player.user_id, guest.user_id, None)
        

    # Search or create a Salon, if players in Salon < 2 return it else create it
    def createSalonRandom(self, type_game):
        """Search or create a Salon, if players in Salon < 2 return it else create it"""
        mainSalon = Salon()
        mainSalon.type_game = type_game
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
            player = salon.players.get(host.user_id)
            if (player):
                print(f'issubclass {isinstance(type(player), Guest)}')
                if (not isinstance(type(player), Guest)):
                    print('This Host already exist !!!!!')
                    return salon
                else:
                    print("Return not salon")
                    return None
        mainSalon.type_game = type_game
        self.salons[type_game].append(mainSalon)
        return (self.salons[type_game][-1])
    
    async def launchInviteGame(self, player):
        checkplayers = 0
        for salon in self.salons[player.type_game]:
            if (len(salon.players) == 2):
                if (salon.players.get(player.user_id)):
                    for pid, pvalue in salon.players.items():
                        if (await pvalue.checkStatus(self.redis_client, self.channel_social) == 'pending'):
                            checkplayers = checkplayers + 1
                        else:
                            return False
                    
                    # start the game
                    if (checkplayers == 2):
                        for pid in salon.players:
                            await self.start_toFront(pid, salon)
                        
                        print(self.create_game())
                        self.games[salon.type_game].append(salon)
                        self.deleteSalon(salon)
                        print(f'length salon invite after start the game -> {len(self.salons['invite'])}')
                        print(f'length salon invite after start the game -> {len(self.games['invite'])}')
                        for salon in self.salons['invite']:
                            try:
                                print(f'length players in salon -> {len(salon.players)}')
                            except Exception as e:
                                print(f'Exception after start the game -> {e}')
                        return True
                    else:
                        return False
                        
                        
    def deleteSalon(self, salontodelete):
        try:
            self.salons[salontodelete.type_game].remove(salontodelete)
        except Exception as e:
            print(f'Exception to delete salon -> {e}')
    
    def create_game(self, type_game, salon):
        # Create game in database with an id and send start game clients and set status
        self.games[type_game].append(salon)
       
        
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
                'cancel': False
            }
        }
        data['body']['opponents'] = salon.getDictPlayers()
        del data['body']['opponents'][id]
        await self.redis_client.publish(self.channel_front, json.dumps(data))


    #############       INVITATION JSON     #############

    # Send invitation game to Client
    async def invitationGameToGuest(self, host, guest, accept):
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
                    },
                },
                'cancel': False
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))
        
    async def invitationGameToHost(self, host, guest, accept):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': host.user_id,
            },
            'body':{
                'type_game': {
                    'invite':{
                        'guest_id': guest.user_id,
                        'username': guest.username,
                        'accept': accept
                    },
                },
                'cancel': False
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
                    },
                },
                'cancel': False
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))
        
    async def cancelInvitation(self, hostid, guestid):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': hostid,
            },
            'body':{
                'type_game': {
                    'invite':{
                        'host_id': guestid,
                    },
                },
                'cancel': True
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

    def getplayers(self, idgame):
        return [1,2]
    
        # for type_game in self.game:
        #     for salon in type_game:
        #         if (salon)
                
                
    async def infoGame(self, data):
        """ answers backend requests on channel 'info_mmaking' """
        try:
            print(f'infoGame data = {data}')
            game_id = int(data.get('game_id', 'x'))
        except Exception as e:
            print(f'infoGame Exception = {e}')
            return
        if game_id:
            players = self.getplayers(game_id)
        key = f"game_{game_id}_players"
        print(f"publish info : {key, json.dumps(players)}")
        await self.redis_client.set(key, json.dumps(players), ex = 2)

    # Simulating your game creation, the ORM function will still be synchronous
    # Async function to create a game asynchronously
    async def create_game_async(self, tournament_id, player1_id, player2_id, round, game_type):
        game = await sync_to_async(self.create_game_sync)(tournament_id, player1_id, player2_id, round, game_type)
        return game


    def create_game_sync(self, tournament_id, player1_id, player2_id, round, game_type):
        # Simulating ORM object creation (replace this with actual ORM code)
        tournament = Tournament.objects.get(id=tournament_id)
        player1 = User.objects.get(id=player1_id)
        player2 = User.objects.get(id=player2_id)
        
        # Create the game in the database (ID is auto-generated by the database)
        game = Game.objects.create(
            tournament=tournament,
            player1=player1,
            player2=player2,
            score_player1=0,
            score_player2=0,
            date=datetime.now(),
            round=round,
            game_type=game_type
        )
        return game