import json
import redis.asyncio as aioredis
from channels.generic.websocket import AsyncWebsocketConsumer #type: ignore
from channels.db import database_sync_to_async #type: ignore
import django

django.setup()
from Selectmode.models import User, Salon, Mode
class GamesConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        self.gameid = None
        self.salonid = None
        self.userid = None
        self.room_group_name = None
        self.mode = None
        self.winner_room = None
        super().__init__(*args, **kwargs)

    async def connect(self):

        await self.accept()


    async def disconnect(self, close_code):
        # Retirer la connexion du groupe
        if (self.gameid is not None):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def add_socket(self, name):
        await self.channel_layer.group_add(
            name,
            self.channel_name
        )



    @database_sync_to_async
    def get_users(self):
        return (list(User.objects.all().values()))

    @database_sync_to_async
    def add_user(self, data):
        try:
            user = User.objects.get(id=data.get('user_id'))
            if (user.play):
                return (False)
            user.play = True
            user.save()
            if (data.get('mode') == '2P'):
                max_player = 2
                max_salon = 1
            elif (data.get('mode') == '4P'):
                max_player = 2
                max_salon = 2
            else:
                return (user.id) 

            game = Mode.objects.filter(mode=f'{data.get('mode')}').latest('id')
            all_salon = game.salon.all()
            salon = all_salon.latest('id')
            print(salon)
            if (salon is None):
                raise Salon.DoesNotExist()
            if ((game.salon.count() >= max_salon and salon.player1 is not None and salon.player2 is not None)):
                raise Mode.DoesNotExist()
            elif(salon.player1 is not None and salon.player2 is not None):
                raise Salon.DoesNotExist()
            else:
                salon.player2 = user
                salon.save() 
        except Mode.DoesNotExist:
            print('create a game')
            salon = Salon.objects.create()
            salon.save()
            salon.player1 = user
            salon.save()
            game = Mode.objects.create(mode=f'{data.get('mode')}')
            game.save()
            game.salon.add(salon)
            game.save()
        except Salon.DoesNotExist:
            print('create salon')
            salon = Salon.objects.create()
            salon.save()
            salon.player1 = user
            salon.save()
            game.salon.add(salon)
            game.save()


        self.salonid = salon.id
        all_salon = game.salon.all()
        id_last_salon = all_salon.latest('id')


        self.gameid = game.id
        print(f'player1:{salon.player1} player2: {salon.player2}')
        data = {
            'id': self.gameid,
            'game_mode': game.mode,
            'id_salon': id_last_salon.id,
            'nb_salons': all_salon.count(),
            'player1': salon.player1_id,
            'player2': salon.player2
        }
        return (data)
    
    async def send_message(self, event):
       await self.send(text_data=json.dumps({
            'group_size': event["group_size"],
            'nbgame': self.gameid,
            'start': True,
            'userid': self.userid,

        }))

    async def display_group_size(self, infos):
        
        group_size = infos.get('nb_player')
        nb_salon = infos.get('nb_salons')
        game_mode = infos.get('game_mode')
        salonid = infos.get('id_salon')
        player1 = infos.get('player1')
        player2 = infos.get('player2')
        print(f'player1:{player1} player2: {player2}')
        await self.send(text_data=json.dumps({
            'user': self.userid,
            'group_size': group_size,
            'nb_salon': nb_salon,
            'idsalon': salonid,
            'new_player': True,
            'start': False
        }))
        if (player1 is not None and player2 is not None and ((nb_salon == 1 and game_mode == '2P') or (nb_salon == 2 and game_mode == '4P'))):

            await self.channel_layer.group_send(self.room_group_name, {
                "type": "send.message",
                "group_size": group_size,
            } )

        # Envoyer la taille du groupe au client via WebSocket


    @database_sync_to_async
    def tournament_endgame(self):
        #Compter le nombre de partie dans le tournois
        user = User.objects.get(id=self.userid)
        user.play = False
        user.save()
        tournament = Mode.objects.get(id=self.gameid)
        salon = tournament.salon.all()
        gamefinish = salon.get(id=self.salonid)

        if (gamefinish.score1 is not None and gamefinish.score2 is not None):
            if ((gamefinish.score1 >= gamefinish.score2 and int(gamefinish.player1.id) == int(self.userid)) or (gamefinish.score1 <= gamefinish.score2 and int(gamefinish.player2.id) == int(self.userid))):
                self.winner_room = f'channel_winner_{self.gameid}'
                infos = {
                    'winner': True,
                    'mode': self.mode,
                    'nbgame': self.gameid,
                    'start': False,
                    'disconect': False,
                }
                if (self.mode == '2P'):
                    infos['disconect'] = True
                if (self.mode == '4P' ):
                    if (salon.latest('id').player1 is not None and salon.latest('id').player2 is not None and salon.count() >= 3):
                        infos['disconect'] = True
                        return infos
                    elif (salon.latest('id').player1 is None and salon.latest('id').player2 is None and salon.count() < 3):
                        gamefinish = Salon.objects.create()
                        gamefinish.save()
                        gamefinish.player1 = user
                        gamefinish.save()
                    else:
                        gamefinish = salon.latest('id')
                        gamefinish.player2 = user
                        gamefinish.save()
                    tournament.salon.add(gamefinish)
                    tournament.save()
                    self.salonid = gamefinish.id

                    infos['idsalon'] = self.salonid


                    if (gamefinish.player1 is not None and gamefinish.player2 is not None):
                        infos['start'] = True
                        user.play = True
                        user.save()
                    else:
                        infos['start'] = False

            else:
                infos = {
                    'winner': False,
                    'mode': self.mode,
                    'disconect': True,
                    'userid': self.userid,
                    'salonid': self.salonid
                }
        return (infos)
        

    async def send_newgame(self, event):
       await self.send(text_data=json.dumps({
            'nbgame': self.gameid,
            'userid': self.userid,
            'start': True,
            'winner': event['winner'],
            'idsalon': self.salonid
        }))

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["payload"]
        if (message.get('user_id')):
            self.userid = message.get('user_id')
        if (message.get('mode') and not message.get('endgame')):
            self.mode = message.get('mode')
            info_database = await self.add_user(message)
            if (not info_database):
                await self.send(text_data=json.dumps({
                    'ingame': True
                }))
                return 
            if (self.gameid is not None):
                self.room_group_name = f'channel_{self.gameid}'
            # Ajouter la connexion au groupe
                await self.channel_layer.group_add(
                    self.room_group_name,
                    self.channel_name
                )
            # renvoie les donnees necessaire au frontend
                await self.display_group_size(info_database)
        elif (message.get('endgame')):
            infosendgame = await self.tournament_endgame()

            if ('start' in infosendgame and infosendgame['start'] == True):
                await self.channel_layer.group_add(self.winner_room, self.channel_name)
                await self.channel_layer.group_send(self.winner_room, {
                    'type': 'send.newgame',
                    'winner': infosendgame['winner']
                }) 
            else:
                if (infosendgame['disconect'] == False):
                    await self.channel_layer.group_add(self.winner_room, self.channel_name)
                else:
                    await self.send(text_data=json.dumps(infosendgame))