import json
import redis.asyncio as aioredis
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import django

django.setup()
from Selectmode.models import User, Salon, Mode

class FakeConsumer(AsyncWebsocketConsumer):
    
    def __init__(self, *args, **kwargs):
        self.iduser = None
        self.idgame = None
        self.idsalon = None
        self.indexUser = None
        self.score1 = None
        self.score2 = None
        self.room_group_name = None
        self.salon_group_name = None
        super().__init__(*args, **kwargs)

    async def connect(self):
        await self.accept()
    
    async def disconnect(self, code_close):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        await self.close()


    @database_sync_to_async
    def setup_score(self):
        game = Mode.objects.get(id=self.idgame)
        salons = game.salon.all()
        for e in salons:
            try:
                e.player.get(id=self.iduser)
                self.idsalon = e.id
                if (e.player.all()[0].id == self.iduser and e.score1 is None):
                    e.score1 = self.score1
                    e.save()
                    self.score2 = e.score2
                    self.indexUser = 0
                elif (e.score2 is None):
                    e.score2 = self.score1
                    e.save()
                    self.score2 = e.score2
                    self.indexUser = 1
            except User.DoesNotExist:
                pass
        
        for e in salons:
            if ((e.score1 is not None and e.id == self.idsalon) and (e.score2 is not None and e.id == self.idsalon)):
                return (True)
        return (False)

        
    async def send_score(self, event):
        await self.send(text_data=json.dumps({
        'endgame': event['endgame'],
        'disconect': True
    }))


    async def receive(self, text_data):
        data_json = json.loads(text_data)
        self.idgame = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'game_{self.idgame}'
        body = data_json['payload']

        if('disconect' in body and body['disconect'] == True):
            await self.disconnect(1000)
            return 
        if ('salonid' in body and body['salonid'] is not None):
            self.salon_group_name = f'channel_salon_{body['salonid']}'
            await self.channel_layer.group_add(
                self.salon_group_name,
                self.channel_name
                )
        self.iduser = body['userid']
        self.score1 = body['score']
        if (await self.setup_score()):    
            try:
                await self.channel_layer.group_send(self.salon_group_name,{
                        'type': 'send.score',
                        'endgame': True,
                    })
            except Exception.Disconnected as e:
                pass

        await self.send(text_data=json.dumps({
            'salonid': self.idsalon,
            'user[index]': self.indexUser,
            'user': self.iduser,
            'score1': self.score1 
        }))


