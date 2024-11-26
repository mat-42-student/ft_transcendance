from uuid import uuid4
from json import dumps, loads
from channels.generic.websocket import AsyncJsonWebsocketConsumer # type: ignore
from redis.asyncio import from_url
from asyncio import create_task
from .consts import DEEP_GROUPS

class GatewayConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.consumer_id = str(uuid4())
        self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
        self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
        await self.pubsub.subscribe(*DEEP_GROUPS.values())  # Souscrire à tous les canaux

        self.listen_task = create_task(self.listen_to_channels())
        await self.accept()
        print("GatewayConsumer accepted incoming websocket")

    async def receive_json(self, data): # data incoming from client ws -> publish to concerned group
        # possible 'dc' values are 'auth', 'user', 'mmaking', 'chat', 'social'
        group = DEEP_GROUPS.get(data['dc'])
        if group is not None:
            try:
                data['exp'] = self.consumer_id
                print(f"Forwarding data to {group}")
                await self.redis_client.publish(group, dumps(data))
            except Exception as e:
                print(f"Publish error : {e}")
        else:
            print("Unknown recipient, message lost")

    async def disconnect(self, close_code):
        # await self.pubsub.unsubscribe(*DEEP_GROUPS.values())
        await self.pubsub.unsubscribe()
        await self.pubsub.close()
        await self.redis_client.close()
        self.listen_task.cancel()

    async def listen_to_channels(self):
        async for message in self.pubsub.listen():
            data = loads(message['data'])
            if data['dc'] == 'gateway':
                print('sending data to client')
                try:
                    await self.send_json(data)
                except Exception as e:
                    print(f"Send error : {e}")
