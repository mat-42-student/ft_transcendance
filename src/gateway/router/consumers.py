import requests
from uuid import uuid4
from json import dumps, loads
from channels.generic.websocket import AsyncJsonWebsocketConsumer # type: ignore
from redis.asyncio import from_url
from asyncio import create_task
from .consts import REDIS_GROUPS #, API_GROUPS

class GatewayConsumer(AsyncJsonWebsocketConsumer):
    """Main websocket"""

    async def connect(self):
        await self.accept()
        try:
            await self.connect_to_redis()
            print("GatewayConsumer accepted incoming websocket")
        except Exception as e:
            print(f"Connection to redis error : {e}")
        self.consumer_id = self.get_user_id()
        self.consumer_id = 'bob' # bypass failing authentication for now
        if self.consumer_id is None:
            print("User is not authenticated. Aborting")
            await self.close()
        else:
            print("User is authenticated")

    async def connect_to_redis(self):
        try:
            self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            await self.pubsub.subscribe(*REDIS_GROUPS.values())  # Subscribe all channels
            self.listen_task = create_task(self.listen_to_channels())
        except Exception as e:
            print(e)
            raise Exception

    async def disconnect(self, close_code):
        await self.pubsub.unsubscribe() # unsubscribe all channels
        await self.pubsub.close()
        await self.redis_client.close()
        self.listen_task.cancel()

    def get_user_id(self):
        data = self.checkAuth()
        if data:
            return data.get('id')
        else:
            return None

    def checkAuth(self):
        pass
        # response = requests.get("http://auth-service:8000/api/auth/ping")
        # if response.status_code == 200:
        #     try:
        #         data = response.json()
        #         return data.get('id')
        #     except ValueError as e:
        #         print("Erreur lors de la conversion en JSON :", e)
        # else:
        #     print(f"Requête échouée avec le statut {response.status_code}")
        # return None

    def valid_json_header(self, data):
        if not isinstance(data, dict):
            return False
        if "header" not in data or "body" not in data:
            return False
        data = data['header']
        if not isinstance(data, dict):
            return False
        if "dest" not in data or "service" not in data or "id" not in data:
            return False
        return True

    async def listen_to_channels(self):
        """Listen redis to send data back to appropriate client"""
        async for message in self.pubsub.listen():
            data = loads(message['data'])
            if data['header']['dest'] == 'front' and data['header']['id'] == self.consumer_id:
                try:
                    await self.send_json(data)
                except Exception as e:
                    print(f"Send error : {e}")

    async def receive_json(self, data):
        """data incoming from client ws -> publish to concerned redis group\n
        possible 'to' values are 'auth', 'user', 'mmaking', 'chat', 'social'"""
        # Testing global structure of data
        if not self.valid_json_header(data):
            print(f"Data error (json) : {data}")
            return
        # data['header']['dest'] = 'back'
        data['body']['id'] = self.consumer_id
        group = REDIS_GROUPS.get(data['header']['dest'])
        if group is not None:
            await self.forward_with_redis(data, group)
            return
        print("Unknown recipient, message lost")

    async def forward_with_redis(self, data, group):
            try:
                print(f"Sending data to {group}")
                await self.redis_client.publish(group, dumps(data))
            except Exception as e:
                print(f"Publish error : {e}")

    # try:
    #     response = requests.get("http://matchmaking:8000/api/test/")
    #     print(response)
    # except Exception as e:
    #     print(f"GET error : {e}")
