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
            if (salon == None):
                raise Salon.DoesNotExist()
            nb_player_in_salon = salon.player.all().count()
            if ((game.salon.count() >= max_salon and nb_player_in_salon >= max_player)):
                raise Mode.DoesNotExist()
            elif(nb_player_in_salon >= max_player):
                raise Salon.DoesNotExist()
            else:
                salon.player.add(user)
                salon.save() 
        except Mode.DoesNotExist:
            salon = Salon.objects.create()
            salon.save()
            salon.player.add(user)
            salon.save()
            game = Mode.objects.create(mode=f'{data.get('mode')}')
            game.save()
            game.salon.add(salon)
            game.save()
        except Salon.DoesNotExist:
            salon = Salon.objects.create()
            salon.save()
            salon.player.add(user)
            salon.save()
            game.salon.add(salon)
            game.save()


        self.salonid = salon.id
        salons = []
        all_salon = game.salon.all()
        id_last_salon = all_salon.latest('id')
        for e in all_salon:
            players = e.player.all()

            sal = {
                f'salon_{e.id}': [{f'player_{player.id}': player.id} for player in players]
            }
            salons.append(sal)

        nb_player_in_salon = all_salon.latest('id').player.all().count()

        self.gameid = game.id
        data = {
            'id': self.gameid,
            'game_mode': game.mode,
            'id_salon': id_last_salon.id,
            'salons': salons,
            'nb_salons': all_salon.count(),
            'nb_player': nb_player_in_salon
        }
        return (data)
    
    async def send_message(self, event):
       await self.send(text_data=json.dumps({
            'group_size': event["group_size"],
            'nbgame': self.gameid,
            'start': True,
            'userid': self.userid
        }))

    async def display_group_size(self, infos):
        
        group_size = infos.get('nb_player')
        nb_salon = infos.get('nb_salons')
        game_mode = infos.get('game_mode')
        salonid = infos.get('id_salon')
        await self.send(text_data=json.dumps({
            'user': self.userid,
            'group_size': group_size,
            'nb_salon': nb_salon,
            'idsalon': salonid,
            'new_player': True,
            'start': False
        }))
        if (group_size == 2 and ((nb_salon == 1 and game_mode == '2P') or (nb_salon == 2 and game_mode == '4P'))):

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
            if ((gamefinish.score1 >= gamefinish.score2 and gamefinish.player.all()[0].id == self.userid) or (gamefinish.score1 <= gamefinish.score2 and gamefinish.player.all()[1].id == self.userid)):
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
                    if (salon.latest('id').player.count() >= 2 and salon.count() >= 3):
                        infos['disconect'] = True
                        return infos
                    elif (salon.latest('id').player.count() >= 2 and salon.count() < 3):
                        gamefinish = Salon.objects.create()
                        gamefinish.save()
                    else:
                        gamefinish = salon.latest('id')
                    gamefinish.player.add(user)
                    gamefinish.save()
                    tournament.salon.add(gamefinish)
                    tournament.save()
                    self.salonid = gamefinish.id

                    infos['idsalon'] = self.salonid


                    if (gamefinish.player.count() == 2):
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
        #if ('disconect' in message and message['disconect'] == True):
        #    self.close()
         #   return 
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