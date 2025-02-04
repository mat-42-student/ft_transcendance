from json import dumps, loads
from channels.generic.websocket import AsyncJsonWebsocketConsumer # type: ignore
from redis.asyncio import from_url
from asyncio import create_task, sleep as asleep
from .consts import REDIS_GROUPS, JWT_PUBLIC_KEY
from datetime import datetime, timezone
from urllib.parse import parse_qs
import jwt

class GatewayConsumer(AsyncJsonWebsocketConsumer):
    """Main websocket"""

    async def connect(self):
        self.connected = False
        self.consumer_id = None
        self.get_user_infos()
        if self.consumer_id is None:
            print("User is not authenticated. Aborting")
            await self.close(code=4401)
            return
        try:
            await self.accept()
            self.connected = True
        except Exception as e:
            print(e)
        print(f"User {self.consumer_id} is authenticated as {self.consumer_name}")
        try:
            await self.connect_to_redis()
        except Exception as e:
            print(f"Connexion to redis error : {e}")
        await self.get_friends_status()
        # await self.send_online_status('online')

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
        # If user was in a game, gameSocket will instantly set status to 'ingame' wether they're offline
        # So we just wait a bit to let mainSocket have the last word
        if not self.connected:
            return
        await asleep(0.5)
        await self.send_online_status('offline')
        await self.pubsub.unsubscribe() # unsubscribe all channels
        await self.pubsub.close()
        await self.redis_client.close()
        self.listen_task.cancel()

    def get_user_infos(self):
        data = self.checkAuth()
        if data:
            self.consumer_id =  data.get('id')
            self.consumer_name = data.get('username')
        else:
            return None

    def checkAuth(self):
        self.public_key = JWT_PUBLIC_KEY
        params = parse_qs(self.scope['query_string'].decode())
        # print (f"params {params}")
        self.token = params.get('t', [None])[0]
        # print (f"token {self.token}")
        try:
            payload = jwt.decode(self.token, self.public_key, algorithms=['RS256'])
            return payload
        except jwt.ExpiredSignatureError as e:
            print(e)
        except jwt.InvalidTokenError as e:
            print(e)
        return None

    async def receive_json(self, data):
        """Data incoming from client ws => publish to concerned redis group.\n
        Possible 'service' values are 'mmaking', 'chat', 'social'"""
        if not self.valid_json_header(data):
            print(f"Data error (json) : {data}")
            return
        group = REDIS_GROUPS.get(data['header']['service'])
        if group:
            data['header']['dest'] = 'back'
            data['header']['id'] = self.consumer_id
            data['header']['token'] = self.token
            data['body']['timestamp'] = datetime.now(timezone.utc).isoformat()
            await self.forward_with_redis(data, group)
            return
        print("Unknown recipient, message lost")

    def valid_json_header(self, data):
        if not isinstance(data, dict):
            return False
        if "header" not in data or "body" not in data:
            return False
        if not isinstance(data['header'], dict):
            return False
        if "service" not in data['header']:
            return False
        return True

    async def listen_to_channels(self):
        """Listen redis to send data back to appropriate client
        possible 'service' values are 'mmaking', 'chat', 'social' and 'notif' """
        async for message in self.pubsub.listen():
            data = loads(message['data'])
            # print(f"Listen Redis on consumer {self.consumer_id}: {data}")
            if self.right_consumer(data['header']['id']) and data['header']['dest'] == 'front':
                try:
                    del data['header']['dest']
                    del data['header']['token']
                    # print(f"Sending: {data}")
                    await self.send_json(data)
                except Exception as e:
                    print(f"Send error : {e}")

    def right_consumer(self, id):
        """check if actual consumer is the recipient we're looking for"""
        return (str(id) == self.consumer_name or int(id) == self.consumer_id)

    async def forward_with_redis(self, data, group):
            try:
                print(f"Sending data to {group}: {data}")
                await self.redis_client.publish(group, dumps(data))
            except Exception as e:
                print(f"Publish error : {e}")

    async def get_friends_status(self):
        """get friends status AND publish my own status"""
        data = {
            "header": {
                "service": "social",
                "dest": "back",
                "id": self.consumer_id
            },
            "body":{
                "status": "info"
            }
        }
        # print(f"Sending data to deep_social: {data}")
        await self.redis_client.publish("deep_social", dumps(data))

    async def send_online_status(self, status):
        """Send all friends our status"""
        data = {
            "header": {
                "service": "social",
                "dest": "back",
                "id": self.consumer_id
            },
            "body":{
                "status": status
            }
        }
        # print(f"Sending data to deep_social: {data}")
        await self.redis_client.publish("deep_social", dumps(data))