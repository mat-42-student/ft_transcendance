import json
import requests
from signal import signal, SIGTERM, SIGINT
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep, create_task
# from models import User, BlockedUser

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
            self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            self.group_name = "deep_social"
            print(f"Subscribing to channel: {self.group_name}")
            await self.pubsub.subscribe(self.group_name)
            self.listen_task = create_task(self.listen())
            while self.running:
                await asleep(1)
        except  Exception as e:
            print(e)
        finally:
            await self.cleanup_redis()

    async def listen(self):
        print(f"Listening for messages...")
        async for msg in self.pubsub.listen():
            if msg:
                try:
                    data = json.loads(msg['data'])
                    if self.valid_social_json(data):
                        await self.process_message(data)
                except Exception as e:
                    print(e)

    def valid_social_json(self, data):
        if data['header']['dest'] != 'back' or data['header']['service'] != 'social':
            return False
        data = data.get('body')
        if not isinstance(data, dict) or "status" not in data:
            return False
        return True

    async def process_message(self, data):
        data['header']['dest'] = 'front' # data destination after deep processing
        user_id = data['header']['id']
        self.user_status[user_id] = data['body']['status']
        friends = self.get_friend_list(user_id)
        if not friends:
            print(f"No friends found for user: {user_id}")
            return
        for friend in friends:
            if self.user_status.get(friend) != 'offline':
                await self.send_status(user_id, friend)

    def get_friend_list(self, user_id):
        """Request friendlist from container 'users'"""
        self.user_status.update({"toto" : "online", "titi": "ingame", "tutu": "offline"})
        return ["toto", "titi", "tutu"]
        # response = requests.get("/users_api/users/<id>/")
        # if response.status_code == 200:
        #     try:
        #         data = response.json()
        #         return data.get('friends')
        #     except ValueError as e:
        #         print("Erreur lors de la conversion en JSON :", e)
        # else:
        #     print(f"Requête échouée avec le statut {response.status_code}")

    async def send_status(self, user_id, friend):
        """publish status of 'user_id' and adress it to 'friend'"""
        data = {
            "header": {
                "service": "social",
                "dest": "front",
                "id": friend
            },
            "body":{
                "user": user_id,
                "status": self.user_status[user_id]
            }
        }
        print(f"Publishing : {data}")
        await self.redis_client.publish(self.group_name, json.dumps(data))

    def signal_handler(self, sig, frame):
        try:
            self.listen_task.cancel()
        except Exception as e:
            print(e)
        self.running = False

    async def cleanup_redis(self):
        print("Cleaning up Redis connections...")
        if self.pubsub:
            await self.pubsub.unsubscribe(self.group_name)
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()