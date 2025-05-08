import json
import requests
from signal import signal, SIGTERM, SIGINT
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep, create_task
from django.conf import settings
from django.core.cache import cache
import jwt
from datetime import datetime, timedelta, timezone
class Command(BaseCommand):
    help = "Async pub/sub redis worker. Listens 'deep_social' channel"

    def handle(self, *args, **kwargs):
        signal(SIGINT, self.signal_handler)
        signal(SIGTERM, self.signal_handler)
        arun(self.main())

    async def main(self):
        self.running = True
        self.user_status = {}
        try:
            await self.connect_redis()
            while self.running:
                await asleep(1)
        except Exception as e:
            print(e)
        finally:
            await self.cleanup_redis()

    async def connect_redis(self):
        REDIS_PASSWORD = settings.REDIS_PASSWORD

        self.redis_client = await from_url(f"redis://:{REDIS_PASSWORD}@redis:6379", decode_responses=True)
        
        self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
        self.REDIS_GROUPS = {
            "gateway": "deep_social",
            "info": "info_social",
            "auth": "auth_social",
        }
        print(f"Subscribing to channels: {', '.join(self.REDIS_GROUPS.values())}")
        await self.pubsub.subscribe(*self.REDIS_GROUPS.values())
        self.listen_task = create_task(self.listen())

    async def listen(self):
        print(f"Listening for messages...")
        async for msg in self.pubsub.listen():
            if msg:
                try:
                    data = json.loads(msg['data'])
                    channel = msg.get('channel')
                    if channel == self.REDIS_GROUPS['info']:
                        await self.info_process(data)
                        continue
                    if channel == self.REDIS_GROUPS['auth']:
                        await self.auth_process(data)
                        continue
                    if self.valid_social_json(data):
                        await self.social_process(data)
                        continue
                except Exception as e:
                    print(e)

    def valid_social_json(self, data):
        if data['header']['dest'] != 'back' or data['header']['service'] != 'social':
            return False
        data = data.get('body')
        if not isinstance(data, dict) or "status" not in data:
            return False
        return True

    async def notifyUser(self, data):
        body = data.get('body')
        if not body:
            return
        user_id = body.get('id')
        from_id = body.get('from')
        if not user_id:
            return
        if not from_id:
            return
        data = self.build_notify_data(user_id, from_id)
        await self.redis_client.publish(self.REDIS_GROUPS['gateway'], json.dumps(data))

    async def social_process(self, data):
        user_id = data['header']['id']
        if data['body'].get('from') == 'mmaking' and self.user_status.get(user_id, "offline") == "offline":
            return
        if data['body']['status'] == 'notify':
           await self.notifyUser(data)
           return
        friends_data = self.get_friend_list(user_id)
        if not friends_data:
            await self.update_status(user_id, data['body']['status'])
            return
        friends = [item['id'] for item in friends_data]
        if data['body']['status'] == 'info': # User's first connection, get all friends status
            await self.send_me_my_friends_status(user_id, friends)
        else:
            await self.update_status(user_id, data['body']['status'])
            for friend in friends:
                if self.user_status.get(friend, "offline") != 'offline':
                    await self.send_my_status(user_id, friend)

    async def update_status(self, user_id, status):
        """ Update self.user_status map.\n
        If user was pending and goes offline, we have to report this to mmaking container """
        if status == "info":
            return
        if status == "offline" and self.user_status.get(user_id) == "pending":
            await self.redis_client.publish(self.REDIS_GROUPS['info'], json.dumps({
                "user_id": user_id,
                "status": "offline"
            }))
        self.user_status[user_id] = status # Update current user status
        # print(f"User {user_id} is now {status}")
        await self.send_me_my_own_status(user_id)

    async def info_process(self, data):
        """ answers backend requests on channel 'info_social' """
        try:
            user_id = int(data.get('user_id', 'x'))
        except Exception as e:
            print(e)
            return
        if user_id:
            status = self.user_status.get(user_id, "offline")
        key = f"user_{user_id}_status"
        await self.redis_client.set(key, status, ex = 2)

        
    async def auth_process(self, data):
        """ answers backend requests on channel 'auth_social' """
        try:
            user_id = int(data.get('user_id', 'x'))
        except Exception as e:
            print(e)
            return
        if user_id:
            status = self.user_status.get(user_id, "offline")
        key = f"is_{user_id}_logged"
        await self.redis_client.set(key, status, ex = 2)

    def get_friend_list(self, user_id):
        """ Request friendlist from container 'users' """
        try:
            payload = {
                "service": "social",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=120),
            }
            
            token = jwt.encode(
                payload,
                settings.BACKEND_JWT["PRIVATE_KEY"],
                algorithm=settings.BACKEND_JWT["ALGORITHM"],
            )

            url = f"https://nginx:8443/api/v1/users/{user_id}/friends/"
            headers = {"Authorization": f"Service {token}"}

            response = requests.get(
                url,
                headers=headers,
                timeout=10,
                cert=("/etc/ssl/social.crt", "/etc/ssl/social.key"),
                verify="/etc/ssl/ca.crt"
            )
            
            response.raise_for_status()
            data = response.json()

            return data.get('friends')

        except jwt.exceptions.PyJWTError as e:
            print(f"JWT Error: {e}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
        except ValueError as e:
            print(f"JSON decode error: {e}")
            return None

    async def send_me_my_friends_status(self, user_id, friends):
        """ publish status of all friends and adress them to 'user_id' """
        for friend in friends:
            data = self.build_social_data(user_id, friend)
            await self.redis_client.publish(self.REDIS_GROUPS['gateway'], json.dumps(data))

    async def send_me_my_own_status(self, user_id):
        """ publish my status and adress them to me """
        data = self.build_social_data(user_id, user_id)
        await self.redis_client.publish(self.REDIS_GROUPS['gateway'], json.dumps(data))

    async def send_my_status(self, user_id, friend):
        """ publish status of 'user_id' and adress it to 'friend', and also to 'user_id' """
        data = self.build_social_data(friend, user_id)
        await self.redis_client.publish(self.REDIS_GROUPS['gateway'], json.dumps(data))

    def build_social_data(self, user_id, friend):
        """user_id will receive friend info"""
        data = {
            "header": {
                "service": "social",
                "dest": "front",
                "id": user_id
            },
            "body":{
                "user_id": friend,
                "status": self.user_status.get(friend, "offline")
            }
        }
        return data

    def build_notify_data(self, user_id, from_id):
        """user_id will receive friend info"""
        data = {
            "header": {
                "service": "notify",
                "dest": "front",
                "id": user_id,
                "from": from_id
            }
        }
        return data

    def signal_handler(self, sig, frame):
        try:
            self.listen_task.cancel()
        except Exception as e:
            print(e)
        self.running = False

    async def cleanup_redis(self):
        print("Cleaning up Redis connections...")
        if self.pubsub:
            await self.pubsub.unsubscribe(self.REDIS_GROUPS['gateway'])
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()