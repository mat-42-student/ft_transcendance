from json import dumps, loads
from channels.generic.websocket import AsyncJsonWebsocketConsumer # type: ignore
from redis.asyncio import from_url
from asyncio import create_task, sleep as asleep
from datetime import datetime, timezone
import requests
import time
from collections import deque
from django.conf import settings

class GatewayConsumer(AsyncJsonWebsocketConsumer):
    """Main websocket"""
    # Anti-flood system
    MESSAGE_LIMIT = 10 # per second
    TIME_WINDOW = 1 # seconds
    MAX_MESSAGE_SIZE = 50
    REDIS_GROUPS = {
        'chat': 'deep_chat',
        'mmaking': 'deep_mmaking',
        'social': 'deep_social',
        'auth': 'auth_social',
    }

    async def connect(self):
        self.message_timestamps = deque(maxlen=self.MESSAGE_LIMIT) # collecting message's timestamp
        self.connected = False
        self.consumer_id = None
        self.consumer_name = None

        if not self.scope["payload"]:
            await self.kick(message="Unauthentified")
            return
        self.get_user_infos()
        if self.consumer_id is None:
            await self.kick(message="Unauthentified")
            return
        try:
            await self.connect_to_redis()
        except Exception as e:
            print(f"Connexion to redis error : {e}")
        if await self.already_connected():
            await self.kick(message="Already connected")
            return

        try:
            await self.accept()
            self.connected = True
        except Exception as e:
            print(e)
        print(f"User {self.consumer_id} is authenticated as {self.consumer_name}")
        await self.send_online_status('online')

    async def already_connected(self):
        status = await self.get_own_status()
        return status != "offline"

    async def connect_to_redis(self):
        try:
            REDIS_PASSWORD = settings.REDIS_PASSWORD

            self.redis_client = await from_url(f"redis://:{REDIS_PASSWORD}@redis:6379", decode_responses=True)
            
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            await self.pubsub.subscribe(*self.REDIS_GROUPS.values())  # Subscribe all channels
            self.listen_task = create_task(self.listen_to_channels())
        except Exception as e:
            print(e)
            raise Exception

    async def user_flooding(self):
        current_time = time.time()
        self.message_timestamps.append(current_time)
        if len(self.message_timestamps) >= self.MESSAGE_LIMIT:
            first_timestamp = self.message_timestamps[0]
            if current_time - first_timestamp <= self.TIME_WINDOW:
                await self.kick(message="Flooding")
                return True
        return False

    async def disconnect(self, close_code):
        if not self.connected:
            return
        await self.send_online_status('offline')
        await self.send_mmaking_disconnection()
        await self.pubsub.unsubscribe() # unsubscribe all channels
        await self.pubsub.close()
        await self.redis_client.close()
        self.listen_task.cancel()

    def get_user_infos(self):
        data = self.scope["payload"]
        if data:
            self.consumer_id =  data.get('id')
            self.consumer_name = data.get('username')
        else:
            return None

    def get_public_key(self):
        try:
            url = "https://nginx:8443/api/v1/auth/public-key/"

            response = requests.get(
                url,
                timeout=10,
                cert=("/etc/ssl/gateway.crt", "/etc/ssl/gateway.key"),
                verify="/etc/ssl/ca.crt"
            )

            if response.status_code == 200:
                self.public_key = response.json().get("public_key") # Ou response.json() si c'est un JSON
            else:
                raise RuntimeError("Impossible de récupérer la clé publique JWT")
        except RuntimeError as e:
            raise(e)
        
    async def receive_json(self, data):
        """Data incoming from client ws => publish to concerned redis group.\n
        Possible 'service' values are 'mmaking', 'chat', 'social'"""
        if await self.user_flooding():
            return
        if not await self.valid_json_header(data):
            return
        group = self.REDIS_GROUPS.get(data['header']['service'])
        if group:
            data['header']['dest'] = 'back'
            data['header']['id'] = self.consumer_id
            # data['header']['token'] = self.token
            data['body']['timestamp'] = datetime.now(timezone.utc).isoformat()
            await self.forward_with_redis(data, group)
            return
        await self.kick()

    async def kick(self, close_code=1008, message="kick"):
        print("KICK! ", self.consumer_name, message)
        try:
            await self.send(text_data=dumps({"action": "disconnect"}))
        except:
            pass
        finally:
            await self.close(code=close_code)

    async def valid_json_header(self, data):
        if len(data) > self.MAX_MESSAGE_SIZE:
            await self.kick(1009, "Message too large")
            return False
        if not isinstance(data, dict):
            await self.kick(code=1003, message="Unsupported data")
            return False
        if "header" not in data or "body" not in data:
            await self.kick(code=1003, message="Unsupported data")
            return False
        if not isinstance(data['header'], dict):
            await self.kick(code=1003, message="Unsupported data")
            return False
        if "service" not in data['header']:
            await self.kick(code=1003, message="Unsupported data")
            return False
        return True

    def check_front_data(self, message):
        try:
            data = message.get('data')
            if not data:
                return None
            data = loads(data)
            if not isinstance(data, dict) or "header" not in data:
                return None
            header = data.get('header')
            if not isinstance(header, dict) or header.get('dest') != 'front':
                return None
        except:
            return None
        return data

    async def listen_to_channels(self):
        """Listen redis to send data back to appropriate client
        possible 'service' values are 'mmaking', 'chat', 'social' """
        async for message in self.pubsub.listen():
            data = self.check_front_data(message)
            if not data:
                continue
            if self.right_consumer(data['header']['id']):
                try:
                    del data['header']['dest']
                    if data['header'].get('token'):
                        del data['header']['token']
                    await self.send_json(data)
                except Exception as e:
                    print(f"Send error : {e}")

    def right_consumer(self, id):
        """check if actual consumer is the recipient we're looking for"""
        return (str(id) == self.consumer_name or int(id) == self.consumer_id)

    async def forward_with_redis(self, data, group):
            try:
                await self.redis_client.publish(group, dumps(data))
            except Exception as e:
                print(f"Publish error : {e}")

    async def get_own_status(self):
        test = 5
        data = {'user_id': self.consumer_id}
        status = None
        await self.redis_client.publish(self.REDIS_GROUPS['auth'], dumps(data))
        while status is None and test >= 0:
            try:
                status = await self.redis_client.get(f'is_{self.consumer_id}_logged')
                if status is not None:
                    return status
            except Exception as e:
                print(f"Error occurred: {str(e)}")
                return "offline"
            await asleep(0.1)
            test -= 1
        return "offline"

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
        await self.redis_client.publish(self.REDIS_GROUPS.get("social"), dumps(data))

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
        await self.redis_client.publish(self.REDIS_GROUPS.get("social"), dumps(data))

    async def send_mmaking_disconnection(self):
        """Send mmaking disco info"""
        data = {
            "header": {
                "service": "mmaking",
                "dest": "back",
                "id": self.consumer_id
            },
            "body":{
                "disconnect": True
            }
        }
        await self.redis_client.publish(self.REDIS_GROUPS.get("mmaking"), dumps(data))