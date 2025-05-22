from django.core.management.base import BaseCommand
from redis.asyncio import from_url
import threading
import json
import asyncio
from asyncio import run as arun, sleep as asleep, create_task
from signal import signal, SIGTERM, SIGINT
from django.conf import settings
from ...models import Game, Tournament, User
from asgiref.sync import sync_to_async, async_to_sync
from datetime import datetime
from django.core.cache import cache
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
            REDIS_PASSWORD = settings.REDIS_PASSWORD

            self.redis_client = await from_url(f"redis://:{REDIS_PASSWORD}@redis:6379", decode_responses=True)
            
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
                        print(f'Message form PONGGG')
                        await self.parseInfoGame(message)
                    
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
    
    # Update and verif if the new status is set
    async def checkStatus(self, player, status):
        statusSetBySocial = None
        numberTry = 5
        
        if (not isinstance(player, Player)):
            return False
        
        while (statusSetBySocial != status and numberTry >= 0):
            try:
                statusSetBySocial = await player.getStatus(self.redis_client, self.channel_social)
                if (statusSetBySocial != 'offline'):
                    await player.updateStatus(self.redis_client, self.channel_deepSocial, status)
                elif (statusSetBySocial == 'offline'):
                    return False
            except Exception as e:
                print(f'CheckStatus failed: {e}')
                return False
            numberTry -= 1
        
        if (numberTry < 0):
            return False
        else:
            return True
          
    
    # Create Player if he didn't already exist somewhere
    async def manage_player(self, header, body):
        player = Player()
        already_player = False
        salonOfPlayer = None
        checkDelete = True
        
        try:
            for type_salon in self.salons.values():
                if (already_player == True):
                    break 
                for salon in type_salon:
                    
                    # Find player in one Salon
                    if (salon.players.get(header.get('id'))):
                        already_player = salon.players.get(header.get('id'))
                        salonOfPlayer = salon
                        break 
                if (already_player):
                    player = already_player
                    break
                        
            # Check if player want give up the search or is disconnect
            if ((player and body.get('cancel') == True) or body.get('disconnect')):
                player.user_id = header['id']
                if (body.get('disconnect') is None):
                    status = await player.getStatus(self.redis_client, self.channel_social)
                else:
                    status = 'offline'
                
                if (status == 'ingame' or status == 'online' or status == 'offline'):
                    salonOfPlayer = None
                    checkDelete = await self.deletePlayer(salonOfPlayer, player)
                elif (status == 'pending'):
                    checkDelete = await self.deletePlayer(salonOfPlayer, player)
                if (checkDelete == False):
                    print(f"player is not delete")
                if (salonOfPlayer is not None and len(salonOfPlayer.players) < 1):
                    self.deleteSalon(salonOfPlayer)
                    
                self.display_salons()
                self.display_games()
                return False

            if (already_player):
                return already_player

            player.user_id = header['id']
            player.type_game = body['type_game']
            return (player)
        except Exception as e:
            print(f'Manage player failed: {e}')
    
    # Cancel invitaiton if i receive just "cancel" (offline)
    async def cancelInvitationOfflinePlayer(self, playerId):
        print("Cancel invitation offline player START")
        salonTodelete = []
        status = 'offline'
        
        for salon in self.salons['invite']:
            for gamer in salon.players.values():
                if (not isinstance(gamer, Guest)):
                    if (gamer.user_id == playerId):
                        salonTodelete.append(salon)
                    try:
                        for guest in gamer.guests.values():
                            if (guest.user_id == playerId):
                                await self.cancelSalonInvitation(gamer.user_id, guest.user_id, 'guest_id')
                                if (status != await gamer.getStatus(self.redis_client, self.channel_social) and await self.checkStatus(gamer, 'online') == False):
                                    print(f'Checkstatus {gamer} is failed')
                            if (gamer.user_id == playerId):
                                await self.cancelSalonInvitation(guest.user_id, playerId, 'host_id')
                                if (status != await guest.getStatus(self.redis_client, self.channel_social) and await self.checkStatus(guest, 'online') == False):
                                    print(f'Checkstatus {guest} is failed')
                    except Exception as e:
                        print(f'gamer iteration failed: {e}')
                elif(isinstance(gamer, Guest)):
                    salonTodelete.append(salon)
                    
        for salon in salonTodelete:
            self.deleteSalon(salon)
            
    def cancelTournamentSalonsPlayerTurnOffline(self, playerId):
        for salon in self.salons['tournament']:
                if (playerId in salon.players):
                    del salon.players[playerId]
                    if (len(salon.players) < 1):
                        self.deleteSalon(salon)
                        return True
        return False
    
    async def search_first_game_without_errors_tournament(self, gamesDB, tournamentId):
        print('debug1')
        print('debug2')
        for game in gamesDB:
            if (game.id in self.games['tournament'][tournamentId]):
                if (self.games['tournament'][tournamentId][game.id].all_players_have_leave_game() or self.games['tournament'][tournamentId][game.id].all_players_have_errors_SocketGame()):
                    pass
                else:
                    return  game
        return None
    
    async def process_errors_in_tournament(self, gameIncache, gameId):
        print("process errors in tournament START")
        gameDatabase = await sync_to_async(self.getGame)(gameId)
        print('1')
        tournament = await sync_to_async(getattr)(gameDatabase, 'tournament')
        print('2')
        if (gameDatabase is not None):
            print('3')
            if (gameIncache.all_players_have_leave_game() == True or gameIncache.all_players_have_errors_SocketGame() == True):
                print('4')
                round_finish = await sync_to_async(self.getallgamesForTournament)(gameDatabase)
                print('5')
                if (round_finish is not None):
                    print('6')
                    if (len(round_finish) == 2):
                        print('7')
                        game_without_error = await self.search_first_game_without_errors_tournament(round_finish, tournament.id)
                        print('8')
                        if (game_without_error is not None):
                            print('9')
                            await self.cancelGameWithWinner_player_leave_game(gameDatabase, gameIncache)          
                            print('10')
                        else:
                            print("Delete tournament because we have no winner")
                    else:
                        print("Delete tournament because we have no winner")
                else:
                    print("Setup a viriable to signal the end of tournament")
                    gameDatabase.failed = True
                    await gameDatabase.asave()
                    # await self.deleteTournament(tournamentId)
            else:
                print('11')
                await self.cancelGameWithWinner_player_leave_game(gameDatabase, gameIncache)
                print('12')
                       
    
    async def cancelTournamentGamesPlayerTurnOffline(self, playerId):
        print(f'cancel tournament player turn offline START')
        for tournamentId in self.games['tournament']:
            for gameId, game in self.games['tournament'][tournamentId].items():
                if (playerId in game.players ):
                    for gamerId in game.players:
                        if (gamerId == playerId):
                            game.players[gamerId].leave_game = True
                        elif (game.players[gamerId].leave_game == False):
                            game.players[gamerId].leave_game = False

                    if(await self.score_is_already_set(gameId) == False):
                        await self.process_errors_in_tournament(game, gameId)
                        return True
        return False
    
    
    async def cancelRandomGamesPlayerTurnOffline(self, playerId):
        print(f'cancel Random player ingame turn offline START')
        for gameId, game in self.games['1vs1R'].items():
                if (playerId in game.players):
                    for gamerId in game.players:
                        if (gamerId == playerId):
                            game.players[gamerId].leave_game = True
                        elif (game.players[gamerId].leave_game == False):
                            game.players[gamerId].leave_game = False
                    
                    gameDB = await sync_to_async(self.getGame)(gameId)
                    await self.cancelGameWithWinner_player_leave_game(gameDB, game)
                    return True
        
        return False
    
    async def cancelRandomSalonPlayerTurnOffline(self, playerId):
        print(f'cancel Random player in salon turn offline START')
        for game in self.salons['1vs1R']:
                if (playerId in game.players):
                    for gamerId, gamer in game.players.items():
                        if (gamerId == playerId):
                            game.players[gamerId].leave_game = True
                        elif (game.players[gamerId].leave_game == False):
                            game.players[gamerId].leave_game = False
                    if (await self.checkStatus(gamer, 'online') == False):
                            print(f'Checkstatus {gamer} is failed')
                    del game.players[playerId]
                    return True
        
        return False
    
    async def cancelInviteGamesPlayerTurnOffline(self, playerId):
        print(f'cancel Invite player turn offline START')
        for gameId, game in self.games['invite'].items():
                if (playerId in game.players and await self.score_is_already_set(gameId) == False):
                    for gamerId, gamer in game.players.items():
                        if (gamerId == playerId):
                            game.players[gamerId].leave_game = True
                        elif (game.players[gamerId].leave_game == False):
                            game.players[gamerId].leave_game = False
                        if ((gameId != playerId) and isinstance(gamer, Guest)):
                            await self.cancelSalonInvitation(gamerId, playerId, 'host_id')
                            await self.cancelSalonInvitation(playerId, gamerId, 'guest_id')
                        elif ((gameId != playerId) and not isinstance(gamer, Guest)):
                            await self.cancelSalonInvitation(gamerId, playerId, 'guest_id')
                            await self.cancelSalonInvitation(playerId, gamerId, 'host_id')
                            
                            
                    
                    gameDB = await sync_to_async(self.getGame)(gameId)
                    await self.cancelGameWithWinner_player_leave_game(gameDB, game)
                    return True
        
        return False
    
    
    async def score_is_already_set(self, gameId):
        try:
            gameDB = await sync_to_async(self.getGame)(gameId)
            winner = await sync_to_async(getattr)(gameDB, 'winner')
            if (winner is not None):
                return True
            else:
                return False
        except Exception as e:
            print(f'Score is already set failed: {e}')              
    
        return False
    
    # Delete player somewhere
    async def deletePlayer(self, salon, player):
        copy_salon = salon
        print(f"Delete {player}")
        try:
            # Cancel offline or ingame
            if (salon is None):
                await self.cancelInvitationOfflinePlayer(player.user_id)
                if (await self.cancelRandomSalonPlayerTurnOffline(player.user_id)):
                    return True
                if (await self.cancelRandomGamesPlayerTurnOffline(player.user_id)):
                    return True
                if (await self.cancelInviteGamesPlayerTurnOffline(player.user_id)):
                    return True
                if (self.cancelTournamentSalonsPlayerTurnOffline(player.user_id) == True):
                    return True
                if (await self.cancelTournamentGamesPlayerTurnOffline(player.user_id) == False):
                    print(f'Player {player} not found in tournament game')
                    
                return True

            # Cancel invitation if guest and host are in the salon (pending)
            elif (salon.type_game == 'invite'):
                print("Cancel invitation with status Pending")
                if (len(salon.players) >= 2):
                    for key, value in salon.players.items():
                        if (not isinstance(value, Guest) and key != player.user_id):
                            await self.cancelSalonInvitation(key, player.user_id ,'guest_id')
                        elif (key != player.user_id):
                            await self.cancelSalonInvitation(key, player.user_id, 'host_id')
                        if (await self.checkStatus(value, 'online') == False):
                            print('new status is not setup')
                    self.salons[salon.type_game].remove(salon)
            # Cancel research random game in salon (pending)
            elif (salon.type_game == '1vs1R'):
                print("Just destroy the player")
                
            # Cancel research tournament in salon (pending)
            elif (salon.type_game == 'tournament'):
                print(f'delete {player} of tournament')
            
            if (await self.checkStatus(player, "online") == False):
                return False
                
            del salon.players[player.user_id]

        except Exception as e:
            print(f'Delete player {e} has failed')
            

    def display_salons(self):
        for type_salon in self.salons:
            print(f'Number of salon in {type_salon}: {len(self.salons[type_salon])}')
            for salon in self.salons[type_salon]:
                try:
                    print(f"{salon}")
                except Exception as e:
                    print(f'Exception print Salon -> {e}')
                    
    def display_games(self):
        for type_game in self.games:
            if (type_game == 'tournament'):
                print(f'Number of {type_game}: {len(self.games[type_game])}')
                for tournamentId, tournament in self.games[type_game].items():
                    print(f'Number of games in {type_game} {tournamentId}: {len(self.games[type_game][tournamentId])}')
                    for id, salon in self.games[type_game][tournamentId].items():
                        try:
                            print(f"Game {id}: {salon}")
                        except Exception as e:
                            print(f'Exception print Salon -> {e}')
            else:
                print(f'Number of games in {type_game}: {len(self.games[type_game])}')
                for salon in self.games[type_game].values():
                    try:
                        print(f"{salon}")
                    except Exception as e:
                        print(f'Exception print Salon -> {e}')

    # Research and verify conditions for the type_game selected
    async def SelectTypeGame(self, data):
        header = data['header']
        body = data['body']
        
        self.display_salons()
        self.display_games()
        if (body.get('GameSocket') == False or body.get('GameSocket') == True):
            await self.checkSocketGame(body, header['id'])
            return 
        # Check if player already exist
        player = await self.manage_player(header, body)
        if (not player):
            return

        payload = {
            "service": "matchmaking",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=120),
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
        
        self.display_salons()
        self.display_games()
        
        
            
            
            
    async def send_1vs1(self, salon, idgame, tournamentId):
        
        for key, player in salon.players.items():
            if (tournamentId is not None):
                await self.nextRoundTournamentJSON(key, player, idgame, tournamentId)
            else:
                await self.start_toFront(key, player, idgame)
        
                
    def gameSockets_are_already_setup_to_players(self, gameInCache):
        for player in gameInCache.players.values():
            if (player.socketGame_is_online is None):
                return False
        return True
            
    async def checkSocketGame(self, data, id):
        playerReady = 0
        playerNotReady = 0
        try:
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
                    if (player.socketGame_is_online == None and data['GameSocket'] == True):
                        player.socketGame_is_online = True
                    elif ((player.socketGame_is_online == None or player.socketGame_is_online == True) and data['GameSocket'] == False):
                        player.socketGame_is_online = False
                
                for gamerId, gamer in gameCache.players.items():
                    if (gamer.socketGame_is_online == False):
                        playerNotReady = playerNotReady + 1
                    elif(gamer.socketGame_is_online == True):
                        playerReady = playerReady + 1
                
                if (playerNotReady + playerReady == 2):
                    if (playerNotReady == 1):
                        await self.cancelGameWithWinner_for_Errors_SocketGame(game, gameCache)
                    elif(playerNotReady == 2):
                        for gamer in gameCache.players.values():
                            if (await self.checkStatus(gamer, 'online') == False):
                                print('checkSocketGame -> checkstatus failed')
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
    
    async def cancelGameWithWinner_for_Errors_SocketGame(self, gameDatabase, gameCache):
        data = {}
        for playerId, player in gameCache.players.items():
            if (player.socketGame_is_online == True):
                data.update({playerId: 1})
            elif (player.socketGame_is_online == False):
                data.update({playerId: 0})
        
        data.update({'game_id': gameDatabase.id})
        try :
            await self.updateScore(data)
        except Exception as e:
            print(f'Cancel game with winner failed: {e}')
            
    async def cancelGameWithWinner_player_leave_game(self, gameDatabase, gameCache):
        print("Cancel game with player leave_game")
        data = {}
        for playerId, player in gameCache.players.items():
            if (player.leave_game == False):
                data.update({playerId: 1})
            elif (player.leave_game == True):
                data.update({playerId: 0})
        
        data.update({'game_id': gameDatabase.id})
        try :
            await self.updateScore(data)
        except Exception as e:
            print(f'Cancel game with winner failed: {e}')
            
    
    
        
            
        
    #############      GENERAL     #############
            

            


        
    #############      INVITE     #############
    
    
    async def while_status_is_different_to_offline(self, player):
        try_out = 10
        status = await player.getStatus(self.redis_client, self.channel_social)
        while(status != 'offline' and try_out >= 0):
            status = await player.getStatus(self.redis_client, self.channel_social)
            
            try_out -= 1
        
        if (try_out < 0):
            return True
        return False
    
    
    # Process to invite
    async def invitation(self, player, obj_invite):


        # Check the frienship with endpoint
        # Check status player
        
        if (obj_invite.get('startgame')):
            if (await self.launchInviteGame(player)):
                return 
        status = await player.getStatus(self.redis_client, self.channel_social)
        
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
            if (not self.checkFriendships(player, host_id)):
                await self.cancelInvitation(player.user_id, host_id, 'host_id')
                return 
                
                    
            # If guest accept invitation
            if (obj_invite.get('accept') == True):
                
                # Need this variable to delete salon if Guets has already invited friend

                # Research salon of the host
                for salon in self.salons['invite']:
                    host = salon.players.get(host_id)
                    if (host):
                        try:
                            if (await host.getStatus(self.redis_client, self.channel_social) != 'online'):
                                await self.cancelInvitation(player.user_id, host.user_id, 'host_id')
                                return
                            # Delete everywhere we find guests and host
                            await self.deleteEverywhereGuestAndHost(player, host_id=host_id)
                            check_status = asyncio.create_task(self.while_status_is_different_to_offline(host))

                            # Guest
                            for guestid in list(host.guests):
                                # # Cancel invitation of other guests of host
                                # if (guestid != player.user_id):
                                #     await self.cancelInvitation(guestid, host.user_id, 'host_id')
                                #     await self.cancelInvitation(host_id, guestid, 'guest_id')
                                #     del host.guests[guestid]
                                # # Add guest to salon by Host
                                if(guestid == player.user_id):
                                    # Setup Guest
                                    guest = host.guests[guestid]
                                    guest.get_user()
                                    guest.type_game = 'invite'
                                    salon.players.update({guestid: guest })
                                        
                                    # update status Guest
                                    guest_status = await guest.getStatus(self.redis_client, self.channel_social)
                                    if (guest_status == 'online' and await self.checkStatus(guest, 'pending') == False):
                                        print('invitation -> checkstatus failed')
                                    await self.invitationGameToGuest(guest, host, True)


                                    
                            # Host
                            host_status = await host.getStatus(self.redis_client, self.channel_social)
                            if (not await check_status):
                                await self.invitationGameToGuest(player, host, False)
                                await self.invitationGameToHost(host, player, False)
                                return
                            
                            if (await self.checkStatus(host, 'pending') != False):
                                await self.invitationGameToHost(host, player, True)
                        finally:
                            if not check_status.done():
                                check_status.cancel()
                                try:
                                    await check_status
                                except asyncio.CancelledError:
                                    print("La tâche asynchrone a été annulée.")

                            


                        
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
            # Build Guest
            guest = Guest()
            try:
                guest.user_id = int(obj_invite['guest_id'])
            except Exception as e:
                print(f'try conversion -> {e}')
                return
            

            
            # Check status guest
            status = await guest.getStatus(self.redis_client, self.channel_social)
            if (status != 'online' or status is None or not self.checkFriendships(player, guest.user_id)):
                await self.cancelInvitation(player.user_id, guest.user_id, 'guest_id')
                return 
            
            if (await self.already_invite(guest, player) == False):
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


    async def already_invite(self, guest, host):
        for salon in self.salons['invite']:
            if (guest.user_id in salon.players):
                print("guest has already host")
                guest_is_host_now = salon.players[guest.user_id]
                if (host.user_id in guest_is_host_now.guests):
                    print(f"Host is already invite by {guest_is_host_now}")
                    await self.cancelInvitation(host.user_id, guest_is_host_now.user_id, 'guest_id')
                    return False
        return True

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
                        await self.cancelInvitation(friendId, player.user_id, 'host_id')
                        await self.cancelInvitation(gamer.user_id, friendId, 'guest_id')
                    salonsTodelete.append(salon)
                
                if (gamerId == host_id):
                    for friendId, friend in gamer.guests.items():
                        if (friendId != player.user_id):
                            await self.cancelInvitation(friendId, host_id, 'host_id')
                            await self.cancelInvitation(gamer.user_id, friendId, 'guest_id')

                if (player.user_id in gamer.guests and gamerId != host_id):
                    await self.cancelInvitation(gamerId, player.user_id, 'guest_id')
                    await self.cancelInvitation(player.user_id, gamerId, 'host_id')
                    del gamer.guests[player.user_id]

                if (host_id in gamer.guests):
                    await self.cancelInvitation(gamerId, host_id, 'guest_id')
                    await self.cancelInvitation(host_id, gamerId, 'host_id')
                    del gamer.guests[host_id]

                if (len(gamer.guests) == 0) and not isinstance(gamer, Guest):
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
                print(f"is instance of Guest: {isinstance(player, Guest)}")
                if (not isinstance(player, Guest)):
                    return salon
                else:
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
                        if (await pvalue.getStatus(self.redis_client, self.channel_social) == 'pending'):
                            checkplayers = checkplayers + 1
                        else:
                            return False
                    for pid, pvalue in salon.players.items():
                        if (await self.checkStatus(pvalue, 'ingame') == False):
                            print('failed Checkstatus')
                    
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
                        await self.send_1vs1(salon, game.id, None)
                        self.deleteSalon(salon)
                        return True
                    else:
                        return False
                        
    def deleteSalon(self, salontodelete):
        try:
            self.salons[salontodelete.type_game].remove(salontodelete)
            return True
        except Exception as e:
            print(f'Exception to delete salon -> {e}')
            return False

    def checkFriendships(self, player, friendId):
        try:
            friendList = player.get_friend_list()
            for friend in friendList:
                if (friendId == friend.get('id')):
                    return True
            
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
        if (await player.getStatus(self.redis_client, self.channel_social) != 'online'):
            return 
        
        # Setup player
        player.get_user()
        await self.deleteEverywhereGuestAndHost(player)

        # Update status player with Social
        if (await self.checkStatus(player, 'pending') == False):
            print(f'In random 1vs1R checkstatus is failed')
            return
        # Create and update Salon
        salon = self.createSalonRandom(player.type_game) 
        salon.players.update({player.user_id: player})
        salon.type_game = player.type_game
        
        # Create and update Game
        self.salons[player.type_game].append(salon)
        
        # Launch game if Salon has 2 players
        if (salon.type_game == '1vs1R' and len(salon.players) >= 2 and len(self.salons[player.type_game]) == 1 ):
            for key, player in salon.players.items():
                if (await self.checkStatus(player, "ingame") == False):
                    print(f'send_1vs1 -> checkstatus failed')
            idgame = await self.create_game(salon.type_game, salon, None)
            if (idgame is None):
                return
            else:
                await self.send_1vs1(salon, idgame, None)
                self.salons[player.type_game].clear()

        elif (salon.type_game == 'tournament'and len(self.salons[salon.type_game]) == self.maxPlayersTournament / 2 and self.allSalonsAreFull()):
            statusPlayers = {}
            for salon_it in self.salons[player.type_game]:
                for key, gamer in salon_it.players.items():
                    if (await self.checkStatus(gamer, "ingame") == False):
                        print(f'send_1vs1 -> checkstatus failed')
            tournament = await sync_to_async(self.create_tournament)()
            if (tournament):
                # send bracket to players

                self.games[player.type_game].update({tournament.id:{}})
                
                # send ingame to players
                for salon in self.salons[player.type_game]:
                    idgame = await self.create_game(salon.type_game, salon, tournament)
                    self.games[player.type_game][tournament.id].update({idgame: salon})
                
                    
                for key, value in self.games[player.type_game][tournament.id].items():
                    await self.send_1vs1(value, key, tournament.id)
                
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
        # Create game in database with an id and send start game clients and set status
        try:
            players_id = []
            for player_id in salon.players:
                players_id.append(player_id)
            game = await self.create_game_sync(tournament_id, players_id[0], players_id[1], 'ranked', round)
            if (not game):
                return None
            if (tournament_id is None):
                self.games[type_game].update({game.id: salon})
            return game.id
        except Exception as e:
            print(f'Error create game {e}')
    
    def setScoreSalonsCacheTournament(self, tournament_id, FinishGames):
        for game in FinishGames:
            try:
                if (game.id in self.games['tournament'][tournament_id]):
                    salon = self.games['tournament'][tournament_id][game.id]
                    salon.score1 = game.score_player1
                    salon.score2 = game.score_player2
                    print(f'{game.id}: score1 = {salon.score1} score2 = {salon.score2}')
            except Exception as e:
                print(f'SetScoreSalonCacheTournament failed: {e}')
        
    
    async def sendNextRoundToClient(self, FinishGames):
        tournament = await sync_to_async(getattr)(FinishGames[0], 'tournament')
        notfound = False
        for gameId, game in  self.games['tournament'][tournament.id].items():
            for oldGame in FinishGames:
                if (gameId == oldGame.id):
                    for playerId, player in game.players.items():
                        winner = await sync_to_async(getattr)(oldGame, 'winner')
                        player1 = await sync_to_async(getattr)(oldGame, 'player1')
                        player2 = await sync_to_async(getattr)(oldGame, 'player2')
                        if (winner.id != playerId and (player1.id == playerId or player2.id == playerId)):
                            if (await self.checkStatus(player, 'online') == False):
                                print("can't to setup new status")
                            if (player.leave_game == False and (player.socketGame_is_online == True or player.socketGame_is_online == None)):
                                await self.JSON_cancelTournament(playerId)
                    notfound = False
                    break
                else:
                    notfound = True
            if (notfound):
                for playerId, player in game.players.items():
                    if (player.leave_game == True):
                        gameDB = await sync_to_async(self.getGame)(gameId)
                        await self.cancelGameWithWinner_player_leave_game(gameDB, game)
                        return 
                    if (await self.checkStatus(player, 'ingame') == False):
                        print("can't to setup new status")
                    await self.nextRoundTournamentJSON(playerId, player, gameId, tournament.id)
      
    async def getNextPlayer(self, gameDB, winnerId):
        tournament = await sync_to_async(getattr)(gameDB, 'tournament')
        gameCache = self.getGameInCache(gameDB.id, tournament.id)
        
        return (gameCache.players[winnerId])
                          

    async def nextRoundTournament(self, previousGames):
        tournament_id = None
        round = None
        salonsdelete = []

        for game in previousGames:
            try:
                salon = self.createSalonRandom('tournament')
                if (game.failed == False):
                    winner = await sync_to_async(getattr)(game, 'winner')
                    player = await self.getNextPlayer(game, winner.id)
                    salon.players.update({player.user_id: player})
                self.salons['tournament'].append(salon)
                tournament = await sync_to_async(getattr)(game, 'tournament')
                tournament_id = tournament.id
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
                if (len(salon.players) < 2):
                    round += 1
                    break
                idgame = await self.create_game('tournament', salon, game.tournament, round)
                self.games['tournament'][tournament_id].update({idgame: salon})
            except Exception as e:
                print(f'try to insert new salons in tournament failed: {e}')
        self.salons['tournament'].clear()
                
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
                'tournament': True,
                'cancel': False
            }
        }
        salonNumber = 1
        bracket = {}
        for i_gamId, salon in self.games[player.type_game][tournamentId].items():
            bracket.update({salonNumber: salon.getDictPlayers()})
            gameDB = await sync_to_async(self.getGame)(i_gamId)
            bracket[salonNumber].update({'round': gameDB.round})
            salonNumber = salonNumber + 1

        data['body']['opponents'] = bracket
        await self.redis_client.publish(self.channel_front, json.dumps(data))
        
    async def sendEndTournamentWithBracketJSON(self, id, player, gameid, tournamentId, winnerId):
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
        for i_gamId, salon in self.games[player.type_game][tournamentId].items():
            bracket.update({salonNumber: salon.getDictPlayers()})
            gameDB = await sync_to_async(self.getGame)(i_gamId)
            if (gameDB is not None):
                bracket[salonNumber].update({'round': gameDB.round})
            salonNumber = salonNumber + 1

        data['body']['opponents'] = bracket
        data['body']['winnerId'] = winnerId
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

    async def cancelSalonInvitation(self, hostid, guestid, to):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': hostid,
            },
            'body':{
                'invite':{
                    to: guestid,
                    'salon': False
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
        
    async def JSON_cancelTournament(self, id):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': id,
            },
            'body':{
                'tournament': False,
                'cancel': True
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))
        
        
    async def JSON_endgameWithoutError(self, id):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': id,
            },
            'body':{
                'cancel': True,
                'invite': False,
                'tournament': True,
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))
        
    async def JSON_endgameWinnerTournament(self, id, winnerId):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': id,
            },
            'body':{
                'cancel': False,
                'tournament': True,
                'winnerId': winnerId
            }
        }
        await self.redis_client.publish(self.channel_front, json.dumps(data))
        
        

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
                                          
        if (len(players) >= 2):
            return players
        else:
            return None


    async def parseInfoGame(self, data):
        if (data.get('game_id')):
            await self.infoGame(data)
        
        elif(data.get('score')):
            await self.updateScore(data.get('score'))
    
    async def updateScore(self, score):
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
        
        print(f'gameID before update score: {game.id}')
        update = await sync_to_async(self.SetScoreGame)(players, game, score_int)
        if (not update):
            print("Score is not update")
            return False
        tournament = await sync_to_async(getattr)(game, 'tournament')
        if (tournament is not None):
            await self.create_nextRound_or_finish_tournament(game, tournament)
        else:
            await self.endGame(game)
            
    async def create_nextRound_or_finish_tournament(self, game, tournament):
        print('create_nextRound_or_finish_tournament')
        all_games_of_tournament_are_Finished = await sync_to_async(self.getallgamesForTournament)(game)
        if (all_games_of_tournament_are_Finished is not None and game.round < self.roundMax + 1):
            # Rajouter une verification si une game parmis toutes possede 2 players avec des errors et ensuite le nombre de game % 2 != 0 alors finir le tournois
            round = await self.nextRoundTournament(all_games_of_tournament_are_Finished)
            if (round <= self.roundMax + 1):
                await self.sendNextRoundToClient(all_games_of_tournament_are_Finished)
            elif (round >= self.roundMax + 1): # if 2 player quit the same game, i come here 
                print("First end tournament")
                # set winner of tournament
                player = await sync_to_async(getattr)(game, 'winner')
                await sync_to_async(self.setTournament_winner_db)(tournament.id, player.id)
                await self.endGame(game)


 
                del self.games['tournament'][tournament.id]
        elif(game.round >= self.roundMax + 1):
            print("second end Tournament")
            # set the winner of tournament !!!!!

            
            if (all_games_of_tournament_are_Finished is not None):
                self.setScoreSalonsCacheTournament(tournament.id, all_games_of_tournament_are_Finished)
            
            player = await sync_to_async(getattr)(game, 'winner')
            await sync_to_async(self.setTournament_winner_db)(tournament.id, player.id)
                
            await self.endGame(game)
            try:
                if (self.games['tournament'][tournament.id][game.id]):
                    del self.games['tournament'][tournament.id]
                self.display_games()
            except Exception as e:
                print(f'delete tournament at the end failed: {e}')
        else:
            print('Waitting next game')
            await self.tournament_waitting_next_game(game)
                
    
    async def tournament_waitting_next_game(self, gameDB):
        tournament = await sync_to_async(getattr)(gameDB, 'tournament')
        gameInCache = self.getGameInCache(gameDB.id, tournament.id)
        
        for playerId, player in gameInCache.players.items():
            if (player.socketGame_is_online == False or player.leave_game == True):
                await self.JSON_cancelTournament(playerId)
                if (await self.checkStatus(player, 'online') == False):
                    print('Imposible to set new status')
            elif (player.socketGame_is_online == True):
                # await self.JSON_endgameWithoutError(playerId)
                if (await self.checkStatus(player, 'pending') == False):
                    print('Imposible to set new status')

                

    async def end_tournament(self, gameDB):
        try:
            print("End tournament START")
            allgamesDB = await sync_to_async(self.getallgamesForTournament)(gameDB)
            tournament = await sync_to_async(getattr)(gameDB, 'tournament')
            winnerTournament = await sync_to_async(getattr)(gameDB, 'winner')
            
            for i_game in allgamesDB:
                gameInCache = self.getGameInCache(i_game.id, tournament.id)
                for playerId, player in gameInCache.players.items():
                    if (player.socketGame_is_online == False):
                        await self.JSON_cancelTournament(playerId)
                    else:
                        print(f'player leave game ->>>>>>>>>>>>{player.leave_game}')
                        if (player.leave_game == False and (player.socketGame_is_online == True or player.socketGame_is_online == None)):
                            await self.sendEndTournamentWithBracketJSON(playerId, player, None, tournament.id, winnerTournament.id)                            
                        await self.JSON_endgameWithoutError(playerId)
                        
                    if (await self.checkStatus(player, 'online') == False):
                        print('Imposible to set new status')
        
        except Exception as e:
            print(f"End tournament is failed: {e}")
        
        print("end tournament is FINISH")
        

    async def end_game_one_vs_one(self, gameDB):
        for type_game in self.games:
            try:
                if (type_game == 'tournament'):
                    pass
                else:
                    gameInCache = self.games[type_game].get(gameDB.id)
                    if (gameInCache is not None):
                        for playerId, player in gameInCache.players.items():
                            if (player.socketGame_is_online == False):
                                pass
                            elif(player.socketGame_is_online == True):
                                await self.JSON_endgameWithoutError(playerId)

                            if (await self.checkStatus(player, 'online') == False):
                                print('Imposible to set new status')
                        del self.games[gameInCache.type_game][gameDB.id]
                        break
            except Exception as e:
                print(f'end game one vs one failed: {e}')
                
        
        
    async def endGame(self, gameDB):
        tournament = await sync_to_async(getattr)(gameDB, 'tournament')
        gameInCache = None
        if (tournament is not None):
            await self.end_tournament(gameDB)
        else:
            await self.end_game_one_vs_one(gameDB)
            
        self.display_salons()
        self.display_games()
                
            
            
    
    async def infoGame(self, data):
        """ answers backend requests on channel 'info_mmaking' """
        try:
            game_id = int(data.get('game_id', 'x'))
        except Exception as e:
            print(f'infoGame Exception = {e}')
            return
        if game_id:
            players =  await sync_to_async(self.getplayers)(game_id)
        if (players is None):
            return
        key = f"game_{game_id}_players"
        await self.redis_client.set(key, json.dumps(players), ex = 2)
        
    #############       Communication with Game     #############



    #############       Database     #############
    
    def all_game_in_the_same_round_without_errors_db(self, tournamentId, gameIdWitherror):
        # Rajouter checker si les games retourner par cette fonction on au moin un joueurs qui na pas leave
        try:
            gameDB = self.getGame(gameIdWitherror)
            gamesOfTournament = Game.objects.filter(tournament=gameDB.tournament, round=gameDB.round)
            if (gameDB.tournament is None):
                return None
            if (len(gamesOfTournament) == 2):
                for game in gamesOfTournament:
                    if (game.id == gameIdWitherror):
                        del gamesOfTournament[game]
                return gamesOfTournament
                        
            else:
                return None
        except Exception as e:
            print(f'error in last_game_in_the_same_round_without_errors_db : {e}')

    def getallgamesForTournament(self, game):
        try:
            gamesOfTournament = Game.objects.filter(tournament=game.tournament, round=game.round)
            if (game.tournament is None):
                return None
            
            for gameDB in gamesOfTournament:
                if (gameDB.score_player1 == 0 and gameDB.score_player2 == 0):
                    return None
            
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
            if (game.score_player1 != 0 or game.score_player2 != 0):
                return False
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
        print(f'Delete game {game.id} in database')
        try:
            game.delete()
        except Exception as e:
            print(f"Delete Game in Database failed: {e}")

    
    def setTournament_winner_db(self, tournamentId, winnerId):
        print("Set winner Tournament in DB START")
        try:
            tournament = Tournament.objects.get(id=tournamentId)
            winner = User.objects.get(id=winnerId)

            tournament.winner = winner
            tournament.save()
        except Exception as e:
            print(f"set tournament winner in db failed: {e}")       
        
                  

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
        await game.asave()
        return game
    #############       Database     #############
    