import requests
from uuid import uuid4
from json import dumps, loads
from channels.generic.websocket import AsyncJsonWebsocketConsumer # type: ignore
from redis.asyncio import from_url
from asyncio import create_task
from .consts import REDIS_GROUPS, API_GROUPS

class GatewayConsumer(AsyncJsonWebsocketConsumer):
    """Main websocket"""
    async def connect(self):
        self.consumer_id = str(uuid4())
        self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
        self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
        await self.pubsub.subscribe(*REDIS_GROUPS.values())  # Subscribe all channels

        self.listen_task = create_task(self.listen_to_channels())
        await self.accept()
        print("GatewayConsumer accepted incoming websocket")

    async def disconnect(self, close_code):
        await self.pubsub.unsubscribe() # unsubscribe all channels
        await self.pubsub.close()
        await self.redis_client.close()
        self.listen_task.cancel()

    async def listen_to_channels(self):
        """Listen redis to send data back to appropriate client"""
        async for message in self.pubsub.listen():
            data = loads(message['data'])
            if data['dest'] == 'front':
                try:
                    await self.send_json(data)
                except Exception as e:
                    print(f"Send error : {e}")

    async def receive_json(self, data):
        """data incoming from client ws -> send a request (GET/POST/etc.) to appropriate container OR publish to concerned redis group\n
        possible 'dc' values are 'auth', 'user', 'mmaking', 'chat', 'social'"""
        data['exp'] = self.consumer_id
        group = API_GROUPS.get(data['dc'])
        if group is not None:
            self.forward_as_HTML_request(data, group)
            return
        group = REDIS_GROUPS.get(data['dc'])
        if group is not None:
            data['dest'] = 'back'
            await self.forward_with_redis(data, group)
            return
        print("Unknown recipient, message lost")

    def forward_as_HTML_request(self, data, group):
        match group:
            case 'auth':
                self.auth_request(data)
            case 'user':
                self.user_request(data)
        try:
            response = requests.get("matchmaking:8000/api/users/")
        except Exception as e:
            print(f"GET error : {e}")
        
    def auth_request(self, data):
        url = "http://auth-service:8000/" + data['url']
        response = requests.post(url) # others methods to implement ?
        self.send_json(response)

    def user_request(self, data):
        pass

    async def forward_with_redis(self, data, group):
            try:
                await self.redis_client.publish(group, dumps(data))
            except Exception as e:
                print(f"Publish error : {e}")
        # try:
        #     response = requests.get("http://matchmaking:8000/api/test/")
        #     print(response)
        # except Exception as e:
        #     print(f"GET error : {e}")
