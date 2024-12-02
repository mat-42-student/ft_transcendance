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
        self.consumer_id = self.checkJWT()
        if self.consumer_id is None:
            return
        # self.consumer_id = str(uuid4()) # waiting for JWT data
        try:
            await self.connect_to_redis()
            await self.accept()
            print("GatewayConsumer accepted incoming websocket")
        except Exception as e:
            print(f"Connection to redis error : {e}")

    async def connect_to_redis(self):
        try:
            self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            await self.pubsub.subscribe(*REDIS_GROUPS.values())  # Subscribe all channels
            self.listen_task = create_task(self.listen_to_channels())
        except:
            raise Exception

    async def disconnect(self, close_code):
        await self.pubsub.unsubscribe() # unsubscribe all channels
        await self.pubsub.close()
        await self.redis_client.close()
        self.listen_task.cancel()

    def checkJWT(self):
        # self.auth_request()
        return "Philou"

    def valid_json(self, data):
        if not(data.get('header') and data.get('body')):
            return False
        data = data['header']
        if not (data.get('from') and data.get('to') and data.get('id')):
            return False

    async def listen_to_channels(self):
        """Listen redis to send data back to appropriate client"""
        async for message in self.pubsub.listen():
            data = loads(message['data'])
            if data['header']['to'] == 'client' and data['header']['id'] == self.consumer_id:
                try:
                    await self.send_json(data)
                except Exception as e:
                    print(f"Send error : {e}")

    async def receive_json(self, data):
        """data incoming from client ws -> publish to concerned redis group\n
        possible 'to' values are 'auth', 'user', 'mmaking', 'chat', 'social'"""
        # Testing global structure of data
        if not self.valid_json(data):
            print(f"Data error (json) : {data}")
            return
        data['body']['id'] = self.consumer_id
        # group = API_GROUPS.get(data['dc'])
        # if group is not None:
        #     self.forward_as_HTML_request(data, group)
        #     return
        group = REDIS_GROUPS.get(data['header']['to'])
        if group is not None:
            await self.forward_with_redis(data, group)
            return
        print("Unknown recipient, message lost")

    # def forward_as_HTML_request(self, data, group):
    #     match group:
    #         case 'auth':
    #             self.auth_request(data)
    #         case 'user':
    #             self.user_request(data)
    #     try:
    #         response = requests.get("matchmaking:8000/api/users/")
    #     except Exception as e:
    #         print(f"GET error : {e}")

    def auth_request(self, data):
        url = "http://auth-service:8000/" + data['url']
        response = requests.post(url)
        return response.text # ?

    # def user_request(self, data):
    #     pass

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
