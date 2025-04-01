from django.core.management.base import BaseCommand
from redis.asyncio import from_url
import json
import asyncio
import time
from asyncio import run as arun, sleep as asleep, create_task
from signal import signal, SIGTERM, SIGINT
from django.conf import settings
import requests
from .models import Game, Tournament, User
from asgiref.sync import sync_to_async, async_to_sync
from datetime import datetime
import os
from django.core.cache import cache
# from .utils import get_ccf_token_cache
import jwt
from datetime import datetime, timedelta, timezone



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
                "1vs1R": {},
                "invite": {},
                "tournament": {}
            }
            
            # Global dict
            self.players = {}
            self.tournament = {}
            self.invite = {} # dict with host_id key and host_player value
            self.message = None

            # limit players tournament
            self.maxPlayersTournament = 4
            self.roundMax = 0

            nbPlayer = self.maxPlayersTournament
            while (nbPlayer / 2 > 1):
                self.roundMax = self.roundMax + 1
                nbPlayer = nbPlayer / 2
            
            print(f'Max round of tournament without final is {self.roundMax}')
            
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
                        if (message.get('header').get('dest') == 'front'):
                            pass
                        else:
                            await self.SelectTypeGame(message)
                    elif (msg.get('channel') == self.channel_pong):
                        await self.parseInfoGame(message)
                    
                    print("listen again...")
                except Exception as e:
                    print(f'error msg: {e}')

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
            
    #############      GENERAL     #############
    
    # Create Player if he didn't already exist somewhere
    async def manage_player(self, header, body):
        print(f'Body in manage to player: {body}')
        player = Player()
        already_player = False
        try:
            for type_salon in self.salons.values():
                if (already_player == True):
                    break 
                for salon in type_salon:
                    
                    # Find player in one Salon
                    if (salon.players.get(header.get('id'))):
                        already_player = salon.players.get(header.get('id'))
                        
                    # Check if player want give up the search or is disconnect
                    if ((already_player and body.get('cancel') == True) or body.get('disconnect') or body.get('cancel') == True):
                        if (already_player):
                            await already_player.updateStatus(self.redis_client, self.channel_deepSocial, "online")
                        print(f'{salon}')
                        if (already_player == False or len(salon.players) <= 1):
                            await self.deletePlayer(False, header['id'])
                        elif (already_player):
                            await self.deletePlayer(salon, already_player)
                        return False
                    

                    if (already_player):
                        player = already_player
                        break
    
            player.user_id = header['id']
            player.type_game = body['type_game']
            return (player)
        except Exception as e:
            print(f'Manage player failed: {e}')
            
    
    # Cancel invitaiton if i receive just "cancel" (offline)
    async def cancelInvitationOfflinePlayer(self, player):
        for salon in self.salons['invite']:
            for gamer in salon.players.values():
                for guest in gamer.guests.values():
                    if (guest.user_id == player):
                        guestStatus = await guest.checkStatus(self.redis_client, self.channel_social)
                        if (guestStatus == 'offline' or guestStatus is None ):
                            print(f'Cancel invitation to host')
                            await self.cancelInvitation(gamer.user_id, guest.user_id, 'guest_id')
                            break
                    if (gamer.user_id == player):
                        await self.cancelInvitation(guest.user_id, player, 'host_id')
    
    async def cancelTournamentOfflinePlayer(self, playerId):
        print(f"Disconnection by {playerId} in tournament")
        for tournament in self.games['tournament']:
            for gameId, game in self.games['tournament'][tournament].items():
                if (playerId in game.players):
                    for gamerId in game.players:
                        if (gamerId == playerId):
                            game.players[gamerId].cancel = True
                        else:
                            game.players[gamerId].cancel = False
                    gameDatabase = sync_to_async(self.getGame)(gameId)
                    if (gameDatabase is not None):
                        await self.cancelGameWithWinner(gameDatabase, game)
                        return 
                    
                    
    
    
    # Delete player somewhere
    async def deletePlayer(self, salon, player):
        copy_salon = salon
        try:
            # Cancel offline or ingame
            if (isinstance(salon, bool)):
                await self.cancelInvitationOfflinePlayer(player)
                await self.cancelTournamentOfflinePlayer(player)
                return

            # Cancel invitation if guest and host are in the salon (pending)
            elif (salon.type_game == 'invite'):
                print("Send all Guest the invitation is unvalible and destroy the salon and player")
                for key, value in salon.players.items():
                    if (not isinstance(value, Guest) and key != player.user_id):
                        print(f'send cancel invitation to key with guest_id in JSON')
                        await self.cancelInvitation(key, player.user_id ,'guest_id')
                    elif (key != player.user_id):
                        print(f'send cancel invitation to key with host_id in JSON')
                        await self.cancelInvitation(key, player.user_id, 'host_id')
                    await value.updateStatus(self.redis_client, self.channel_deepSocial, 'online' )
                self.salons[salon.type_game].remove(salon)
            # Cancel research random game in salon (pending)
            elif (salon.type_game == '1vs1R'):
                print("Just destroy the player")
                
            # Cancel research tournament in salon (pending)
            elif (salon.type_game == 'tournament'):
                print(f'delete {player} of tournament')
                
            del salon.players[player.user_id]
            print(f'salon.type_game with player to deleted : {salon.type_game}')

        except Exception as e:
            print(f'Delete player {e} has failed')
            

    # Research and verify conditions for the type_game selected
    async def SelectTypeGame(self, data):
        header = data['header']
        body = data['body']
        
        
        if (body.get('GameSocket') == False or body.get('GameSocket') == True):
            await self.checkSocketGame(body, header['id'])
            return 
        # Check if player already exist
        player = await self.manage_player(header, body)
        if (not player):
            return
        
        # token = await get_ccf_token_cache()

        # Generate the token
        payload = {
            "service": "matchmaking",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        }
        
        token = jwt.encode(
            payload,
            settings.BACKEND_JWT["PRIVATE_KEY"],
            algorithm=settings.BACKEND_JWT["ALGORITHM"],
        )

        # Setup token to request endpoints api
        player.token = token

        if (body.get('type_game') == '1vs1R' or body.get('type_game') == 'tournament'): # 1vs1R
            player.type_game = body.get('type_game')
            await self.random(player)
        elif (body.get('type_game').get('invite')): # Invite
            player.type_game = 'invite'
            invite = body['type_game']['invite']
            await self.invitation(player, invite)
            
            
            
    async def send_1vs1(self, salon, idgame):
         for key, player in salon.players.items():
            await self.start_toFront(key, player, idgame)
            await player.updateStatus(self.redis_client, self.channel_deepSocial, "ingame")
            
    async def checkSocketGame(self, data, id):
        playerReady = 0
        playerNotReady = 0
        try:
            print(f'Start CheckGameSocket')
            gameId = data['gameId']
            game = await sync_to_async(self.getGame)(gameId)
            tournament = await sync_to_async(getattr)(game, 'tournament')
            gameCache = None
            if (tournament):
                gameCache = self.getGameInCache(gameId, tournament.id)
            else:
                gameCache = self.getGameInCache(gameId, None)
                
            playerVerif = await sync_to_async(self.checkPlayerInGame)(id, game)
            if (playerVerif == True):
                player = gameCache.players[id]
                if (gameCache is not None):
                    print(f'GameCache is not None')
                    print(f'State GameSocket: {data['GameSocket']}')
                    if (data['GameSocket'] == True):
                        player.cancel = False
                    elif (data['GameSocket'] == False):
                        player.cancel = True
                print(f'player.cancel: {player.cancel}')
                
                print(f'Test cancelGame ?')
                for gamerId, gamer in gameCache.players.items():
                    if (gamer.cancel == True):
                        playerNotReady = playerNotReady + 1
                    elif(gamer.cancel == False):
                        playerReady = playerReady + 1
                
                print(f'playerNorReady: {playerNotReady}')
                if (playerNotReady + playerReady == 2):
                    if (playerNotReady == 1):
                        await self.cancelGameWithWinner(game, gameCache)
                    elif(playerNotReady == 2):
                        for gamer in gameCache.players.values():
                            await gamer.updateStatus(self.redis_client, self.channel_deepSocial, 'online')
                        await sync_to_async(self.deleteGameDatabase)(game)

        except Exception as e:
            print(f'CheckSocketGame failed: {e}')
            
    def getGameInCache(self, gameId, tournamenId):
        for type_game, allGames in self.games.items():
            if (type_game == 'tournament'):
                if (tournamenId != None):
                    if (gameId in allGames[tournamenId]):
                        return allGames[tournamenId][gameId]
                else:
                    return None
            else:
                if (gameId in allGames):
                    return allGames[gameId]
        return None
    
    async def cancelGameWithWinner(self, gameDatabase, gameCache):
        data = {}
        for playerId, player in gameCache.players.items():
            if (player.cancel == False):
                data.update({playerId: 1})
            elif (player.cancel == True):
                data.update({playerId: 0})
        
        data.update({'game_id': gameDatabase.id})
        await self.updateScore(data)
        
            
        
    #############      GENERAL     #############
            

            


        
    #############      INVITE     #############
    
    # Process to invite
    async def invitation(self, player, obj_invite):


        # Check the frienship with endpoint
        # Check status player
        
        if (obj_invite.get('startgame')):
            if (await self.launchInviteGame(player)):
                return 
        status = await player.checkStatus(self.redis_client, self.channel_social)
        
        # Setup host
        player.get_user()
        
        if (status != 'online' or status is None):
            try:
                guestid = int(obj_invite.get('guest_id'))
                await self.cancelInvitation(player.user_id, guestid, 'guest_id')
            except Exception as e:
                print(e)
            return 
            
        # Receive the msg by Guest    
        if (obj_invite.get('host_id')):
            host_id = None
            try:
                host_id = int(obj_invite.get('host_id'))
            except Exception as e:
                print(e)
                return 
            if (not await self.checkFriendships(player, host_id)):
                await self.cancelInvitation(player.user_id, host_id, 'host_id')
                return 
                
                    
            # If guest accept invitation
            if (obj_invite.get('accept') == True):
                
                # Need this variable to delete salon if Guets has already invited friend


                # Research salon of the host
                for salon in self.salons['invite']:
                    host = salon.players.get(host_id)
                    if (host):
                        # Delete everywhere we find guests and host
                        await self.deleteEverywhereGuestAndHost(player, host_id=host_id)
                        # Guest
                        for guestid in list(host.guests):
                            # Cancel invitation of other guests of host
                            if (guestid != player.user_id):
                                await self.cancelInvitation(guestid, host.user_id, 'host_id')
                                await self.cancelInvitation(host_id, guestid, 'guest_id')
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
                        await self.invitationGameToHost(host, player, True)


                        
            elif (obj_invite.get('accept') == False):
                # Research salon of the host
                salonCopy = None
                for salon in self.salons['invite']:
                    try:
                        host = salon.players.get(host_id)
                        if (host):
                            del host.guests[player.user_id]
                            await self.invitationGameToHost(host, player, False)
                            if (len(host.guests) == 0):
                                salonCopy = salon
                    except Exception as e:
                        print(f'exception is raise {e}')
                try:
                        self.salons[player.type_game].remove(salonCopy)
                except Exception as e:
                    print(f'try to delete salon if len(guests) == 0: {e}')
                        
                

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
            if (status != 'online' or status is None or not await self.checkFriendships(player, guest.user_id)):
                print(f"Guest Status is Bad -> {status}")
                await self.cancelInvitation(player.user_id, guest.user_id, 'guest_id')
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
        

    async def deleteEverywhereGuestAndHost(self, player, host_id=-1):
        '''Delete the players (player and host_id) in all guests tab of all Hosts, all guests in this tab.  \n
        If no host player default host_id = -1 \n
        player = Instance Player \n
        host_id = int
        '''
        salonsTodelete = []

        for salon in self.salons['invite']:
            for gamerId, gamer in salon.players.items():

                if (gamerId == player.user_id):
                    for friendId, friend in gamer.guests.items():
                        print(f'send CancelInvitationto {friendId}')
                        await self.cancelInvitation(friendId, gamer.user_id, 'host_id')
                        await self.cancelInvitation(gamer.user_id, friendId, 'guest_id')
                    salonsTodelete.append(salon)

                if (player.user_id in gamer.guests and gamerId != host_id):
                    await self.cancelInvitation(gamerId, player.user_id, 'guest_id')
                    await self.cancelInvitation(player.user_id, gamerId, 'host_id')
                    del gamer.guests[player.user_id]

                if (host_id in gamer.guests):
                    await self.cancelInvitation(gamerId, host_id, 'guest_id')
                    await self.cancelInvitation(host_id, gamerId, 'host_id')
                    del gamer.guests[host_id]

                if (len(gamer.guests) == 0):
                    salonsTodelete.append(salon)
        for salon in salonsTodelete:
            try:
                self.salons['invite'].remove(salon)
            except Exception as e:
                print(f'Delete salon by DeleteEveryWhereGuestAndHost failed: {e}')


    def createSalonInvite(self, type_game, host):
        """Search Salon belongs to host or create it, if players has not it"""
        mainSalon = Salon()
        for salon in self.salons[type_game]:
            player = salon.players.get(host.user_id)
            if (player):
                if (not isinstance(type(player), Guest)):
                    print('This Host already exist !!!!!')
                    return salon
                else:
                    print("It is a Guest")
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
                        player1 = None
                        player2 = None
                        for pid in salon.players:
                            
                            if (pid == player.user_id):
                                player1 = pid
                            else:
                                player2 = pid
                        
                        game = await self.create_game_sync(None, player1, player2, 'friendly')
                        self.games[salon.type_game].update({game.id: salon})
                        await self.send_1vs1(salon, game.id)
                        self.deleteSalon(salon)
                        return True
                    else:
                        return False
                        
    def deleteSalon(self, salontodelete):
        try:
            self.salons[salontodelete.type_game].remove(salontodelete)
        except Exception as e:
            print(f'Exception to delete salon -> {e}')

    async def checkFriendships(self, player, friendId):
        try:
            friendList = await player.get_friend_list()
            for friend in friendList:
                if (friendId == friend.get('id')):
                    return True
                print(f'friend: {friend}')
            
            return False
        except Exception as e:
            print(f'check Friendships failed: {e}')
            return False

    #############      INVITE     #############
            
            
            
    #############      RANDOM     #############


    # Setup data to player (username, avatar), create and update salon then create game  
    async def random(self, player):
        """Setup data to player (username, avatar), create and update salon then create game """
        
        # Check the status for research random game
        if (await player.checkStatus(self.redis_client, self.channel_social) != 'online'):
            return 
        
        # Setup player
        player.get_user()
        await self.deleteEverywhereGuestAndHost(player)

        # Create and update Salon
        salon = self.createSalonRandom(player.type_game)
        salon.players.update({player.user_id: player})
        salon.type_game = player.type_game
        
        # Create and update Game
        self.salons[player.type_game].append(salon)
        
        # Update status player with Social
        await player.updateStatus(self.redis_client, self.channel_deepSocial, 'pending')

        print(f'Salon {player.type_game} length -> {len(self.salons[player.type_game])}')
        for salon in self.salons[player.type_game]:
            print(f'Length of players : {len(salon.players)}')
            try:
                print(f"{salon.players}")
            except Exception as e:
                print(f'Exception print Salon -> {e}')
        
        # Launch game if Salon has 2 players
        if (salon.type_game == '1vs1R' and len(salon.players) >= 2 and len(self.salons[player.type_game]) == 1 ):
            idgame = await self.create_game(salon.type_game, salon, None)
            if (idgame is None):
                return
            else:
                await self.send_1vs1(salon, idgame)
                self.salons[player.type_game].clear()

        elif (salon.type_game == 'tournament'and len(self.salons[salon.type_game]) == self.maxPlayersTournament / 2 and self.allSalonsAreFull()):
            tournament = await sync_to_async(self.create_tournament)()
            if (tournament):
                # send bracket to players
                
                self.games[player.type_game].update({tournament.id:{}})
                # send ingame to players
                for salon in self.salons[player.type_game]:
                    idgame = await self.create_game(salon.type_game, salon, tournament)
                    await self.send_1vs1(salon, idgame)
                    self.games[player.type_game][tournament.id].update({idgame: salon})
                    
                self.salons[player.type_game].clear()

    # check salons
    def allSalonsAreFull(self):
        for salon in self.salons['tournament']:
            if (len(salon.players) < 2):
                return False
        
        return True
        
    
    # Search or create a Salon, if players in Salon < 2 return it else create it
    def createSalonRandom(self, type_game):
        """Search or create a Salon, if players in Salon < 2 return it else create it"""
        mainSalon = Salon()
        mainSalon.type_game = type_game
        for salon in self.salons[type_game]:
            if (salon is not None and len(salon.players) < 2):
                mainSalon = salon
                try:
                    self.salons[salon.type_game].remove(salon)
                except Exception as e:
                    print(e)
                break
        return (mainSalon)
    
    async def create_game(self, type_game, salon, tournament_id, round=1):
        print(f'Create game')
        # Create game in database with an id and send start game clients and set status
        players_id = []
        for player_id in salon.players:
            players_id.append(player_id)
        game = await self.create_game_sync(tournament_id, players_id[0], players_id[1], 'ranked', round)
        if (not game):
            print(f'game is not create')
            return None
        if (tournament_id is None):
            self.games[type_game].update({game.id: salon})
        print(f"game.id: {game.id}")
        return game.id
    
    def setScoreSalonsCacheTournament(self, tournament_id, FinishGames):
        for game in FinishGames:
            try:
                if (game.id in self.games['tournament'][tournament_id]):
                    salon = self.games['tournament'][tournament_id][game.id]
                    salon.score1 = game.score_player1
                    salon.score2 = game.score_player2
            except Exception as e:
                print(f'SetScoreSalonCacheTournament failed: {e}')
    
    async def sendNextRoundToClient(self, FinishGames):
        tournamentId = FinishGames[0].tournament.id
        notfound = False
        for gameId, game in  self.games['tournament'][tournamentId].items():
            for oldGame in FinishGames:
                if (gameId == oldGame.id):
                    for playerId, player in game.players.items():
                        if (oldGame.winner.id != playerId and (oldGame.player1.id == playerId or oldGame.player2.id == playerId)):
                            print(f'Send nextroundToclient has loose the previous game')
                            await player.updateStatus(self.redis_client, self.channel_deepSocial, 'online')
                            await self.nextRoundTournamentJSON(playerId, player, None, tournamentId)
                    notfound = False
                    break
                else:
                    notfound = True
            if (notfound):
                for playerId, player in game.players.items():
                    print(f'Send nextroundToclient has win the previous game')
                    await player.updateStatus(self.redis_client, self.channel_deepSocial, 'ingame')
                    await self.nextRoundTournamentJSON(playerId, player, gameId, tournamentId)
                        

    def nextRoundTournament(self, previousGames):
        tournament_id = None
        round = None

        for game in previousGames:
            try:
                salon = self.createSalonRandom('tournament')
                player = Player()
                player.user_id = game.winner.id
                player.type_game = 'tournament'
                player.get_user()
                salon.players.update({player.user_id: player})
                self.salons['tournament'].append(salon)
                tournament_id = game.tournament.id
                round = game.round
            except Exception as e:
                print(f'Create new salons failed: {e}')

        self.setScoreSalonsCacheTournament(tournament_id, previousGames)
        
        if (round >= self.roundMax + 1):
            return None
        
        # Set next round
        round = round + 1
        for salon in self.salons['tournament']:
            try:
                idgame = async_to_sync(self.create_game)('tournament', salon, game.tournament, round)
                self.games['tournament'][tournament_id].update({idgame: salon})
            except Exception as e:
                print(f'try to insert new salons in tournament failed: {e}')
        self.salons['tournament'].clear()

        print(f'Games tournament length -> {len(self.games['tournament'][tournament_id])}')
        for salon in self.games['tournament'][tournament_id].values():
            print(f'Length of players : {len(salon.players)}')
            try:
                print(f"{salon.players}")
            except Exception as e:
                print(f'Exception print Salon -> {e}')
                
        return round
        
       
    
    #############      RANDOM     #############



    #############      JSON     #############
    
    async def nextRoundTournamentJSON(self, id, player, gameid, tournamentId):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': id,
            },
            'body':{
                'status': 'ingame',
                'id_game': gameid,
                player.type_game: True,
                'cancel': False
            }
        }
        salonNumber = 1
        bracket = {}
        for salon in self.games[player.type_game][tournamentId].values():
            bracket.update({salonNumber: salon.getDictPlayers()})
            salonNumber = salonNumber + 1

        data['body']['opponents'] = bracket
        await self.redis_client.publish(self.channel_front, json.dumps(data))

    # Send status ingame to Front to start a game with all opponents
    async def start_toFront(self, id, player, gameid):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': id,
            },
            'body':{
                'status': 'ingame',
                'id_game': gameid,
                player.type_game: True,
                'cancel': False
            }
        }
        salonNumber = 1
        bracket = {}
        for salon in self.salons[player.type_game]:
            bracket.update({salonNumber: salon.getDictPlayers()})
            salonNumber = salonNumber + 1

        data['body']['opponents'] = bracket
        await self.redis_client.publish(self.channel_front, json.dumps(data))


    # Send invitation game to Client
    async def invitationGameToGuest(self, host, guest, accept):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': host.user_id,
            },
            'body':{
                'invite':{
                    'host_id': guest.user_id,
                    'username': guest.username,
                    'accept': accept
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

                'invite':{
                    'guest_id': guest.user_id,
                    'username': guest.username,
                    'accept': accept
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
                'invite':{
                    'guest_id': guestid,
                    'accept': accept,
                    'send': True
                },
                'cancel': False
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))
        
    async def cancelInvitation(self, hostid, guestid, to):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': hostid,
            },
            'body':{
                'invite':{
                    to: guestid,
                },
                'cancel': True
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))
        
        
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

    #############       JSON     #############


    #############       Communication with Game     #############


    def getplayers(self, idgame):
        players = []
        game_database = None
        tournament_id = None
        try:
            idgame = int(idgame)
            game_database = Game.objects.get(id=idgame)
            if (game_database.tournament is not None):
                tournament_id = game_database.tournament.id
            
        except Exception as e:
            print(f'Game does not exist -> {e}')
            return None
        for type_game in self.games:
            try:
                if (type_game == 'tournament'):
                    if (tournament_id in self.games['tournament']):
                        if (game_database.id in self.games['tournament'][tournament_id]):           
                            for player in self.games['tournament'][tournament_id][game_database.id].players.values():
                                if (player.user_id == game_database.player1.id or player.user_id == game_database.player2.id):
                                    players.append(player.user_id)
                else:
                    salon = self.games[type_game][idgame]
                    if (salon):                
                        for player in salon.players.values():
                            if (player.user_id == game_database.player1.id or player.user_id == game_database.player2.id):
                                players.append(player.user_id)
            except Exception as e:
                print(f"getplayers failed: {e}")
                        
                        
                    
        print(f'send players to pong -> {players}')
        if (len(players) >= 2):
            return players
        else:
            return None


    async def parseInfoGame(self, data):
        print(f'parseInfoGame -> {data}')
        if (data.get('game_id')):
            await self.infoGame(data)
        
        elif(data.get('score')):
            await self.updateScore(data.get('score'))
    
    async def updateScore(self, score):
        print(f'score -> {score}')

        if (len(score) < 3):
            return False
        
        players = []
        score_int = {}

        for key, value in score.items():
            try:
                if (key != 'game_id'):
                    players.append(int(key))
                    score_int[int(key)] = int(value)
                else:
                    score_int[key] = int(value)


            except Exception as e:
                print(f'Try conversion -> {e}')
                return False
        game = await sync_to_async(self.getGame)(score['game_id'])
        for player in players:
            if (not await sync_to_async(self.checkPlayerInGame)(player, game)):
                return False
            
        print(f'score_int {score_int}')
        update = await sync_to_async(self.SetScoreGame)(players, game, score_int)
        if (not update):
            return False
        
        if (await sync_to_async(getattr)(game, 'tournament') is not None):
            gamesOfTournament = await sync_to_async(self.getallgamesForTournament)(game)
            print(f"Round of game -> {game.round}")
            if (gamesOfTournament is not None and game.round < self.roundMax+1):
                round = await sync_to_async(self.nextRoundTournament)(gamesOfTournament)
                if (round is not None):
                    await self.sendNextRoundToClient(gamesOfTournament)
            else:
                await self.endGame(game)
        else:
            await self.endGame(game)
            
            
        
    async def endGame(self, game):
        print(f'EndGame is started')
        tournament = await sync_to_async(getattr)(game, 'tournament')
        gameInCache = None
        if (tournament is not None):
            gameInCache = self.games['tournament'][tournament.id][game.id]
        else:
            for type_game in self.games:
                try:
                    if (type_game == 'tournament'):
                        pass
                    else:
                        gameInCache = self.games[type_game].get(game.id)
                        if (gameInCache is not None):
                            break
                except Exception as e:
                    print(f'endgame failed: {e}')
        
        for playerId, player in gameInCache.players.items():
            try:
                data = {
                    'header':{
                        'service': 'mmaking',
                        'dest': 'front',
                        'id': playerId,
                    },
                    'body':{
                        'cancel': True,
                        'invite': False,
                        'tournament': True,
                    }
                }
                await player.updateStatus(self.redis_client, self.channel_deepSocial, 'online')
                await self.redis_client.publish(self.channel_front, json.dumps(data))
            except Exception as e:
                print(f'Send engame failed: {e}')
                
            
            
    
    async def infoGame(self, data):
        """ answers backend requests on channel 'info_mmaking' """
        try:
            print(f'infoGame data = {data}')
            game_id = int(data.get('game_id', 'x'))
        except Exception as e:
            print(f'infoGame Exception = {e}')
            return
        if game_id:
            players =  await sync_to_async(self.getplayers)(game_id)
        if (players is None):
            return
        key = f"game_{game_id}_players"
        print(f"publish info : {key, json.dumps(players)}")
        await self.redis_client.set(key, json.dumps(players), ex = 2)
        
    #############       Communication with Game     #############



    #############       Database     #############

    def getallgamesForTournament(self, game):
        try:
            gamesOfTournament = Game.objects.filter(tournament=game.tournament, round=game.round)
            if (game.tournament is None):
                return None
            
            for game in gamesOfTournament:
                if (game.score_player1 == 0 and game.score_player2 == 0):
                    return None
            print(f'all games: {gamesOfTournament}')
            
        except Exception as e:
            print(f'Game of tournament failed:  {e}')

        return gamesOfTournament
    
    

    def create_tournament(self):
        print('Creation Tournament')
        try:
            tournament = Tournament.objects.create(name='t', round_max=self.roundMax)
            print(f'tournament id = {tournament.id}')
            return tournament

        except Exception as e:
            print(f'creation of tournament failed -> {e}')
            return None

    def SetScoreGame(self, players, game, score_int):
        try:
            for player in players:
                if (game.player1.id == player):
                    game.score_player1 = score_int[player]
                elif (game.player2.id == player):
                    game.score_player2 = score_int[player]

            if (game.score_player1 > game.score_player2):
                game.winner = game.player1
            else:
                game.winner = game.player2
            game.save()
        except Exception as e:
            print(f'error set score {e}')
            return False

        return True


    def getGame(self, idgame):
        try:
            game = Game.objects.get(id=idgame)
            return game
        except Game.DoesNotExist as e:
            print(e)
            return None

    def checkPlayerInGame(self, player_id, game):
        try:
            player = User.objects.get(id=player_id)

            if (player.id == game.player1.id ):
                return True
            elif (player.id == game.player2.id ):
                return True
            else:
                False
        except Exception as e:
            print(f'Someone not exist -> {e}')
            return False
        
    def deleteGameDatabase(self, game):
        try:
            game.delete()
        except Exception as e:
            print(f"Delete Game in Database failed: {e}")
        
        
                  

    async def create_game_sync(self, tournament_id, player1_id, player2_id, game_type, nbRound=1):
        # Simulating ORM object creation (replace this with actual ORM code)
        # tournament = Tournament.objects.get(id=tournament_id)
        try:
            player1 = await User.objects.aget(id=player1_id)
            player2 = await User.objects.aget(id=player2_id)
        except Exception as e:
            print(f"Some player not exist -> {e}")
            return 
        # Create the game in the database (ID is auto-generated by the database)
        game = await Game.objects.acreate(
            tournament=tournament_id,
            player1=player1,
            player2=player2,
            score_player1=0,
            score_player2=0,
            date=datetime.now(),
            round=nbRound,
            game_type=game_type
        )
        print(f'asave : {await game.asave()}')
        return game
    #############       Database     #############
    