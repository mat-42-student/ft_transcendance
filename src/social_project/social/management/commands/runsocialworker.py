import json
import requests
from signal import signal, SIGTERM, SIGINT
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep, create_task

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
            self.gateway_group = "deep_social"
            self.info_group = "info_social"
            print(f"Subscribing to channels: {self.gateway_group}, {self.info_group}")
            await self.pubsub.subscribe(self.gateway_group)
            await self.pubsub.subscribe(self.info_group)
            self.listen_task = create_task(self.listen())
            while self.running:
                await asleep(1)
        except Exception as e:
            print(e)
        finally:
            await self.cleanup_redis()

    async def listen(self):
        print(f"Listening for messages...")
        async for msg in self.pubsub.listen():
            if msg:
                try:
                    data = json.loads(msg['data'])
                    if msg.get('channel') == "info_social":
                        await self.get_info_process(data)
                        continue
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
        friends_data = self.get_friend_list(user_id)
        if not friends_data:
            # print(f"No friends found for user: {user_id}")
            await self.update_status(user_id, data['body']['status'])
            return
        friends = [item['id'] for item in friends_data]
        if data['body']['status'] == 'info': # User's first connection, get all friends status
            await self.send_me_my_friends_status(user_id, friends)
        await self.update_status(user_id, data['body']['status'])
        for friend in friends:
            if self.user_status.get(friend, "offline") != 'offline':
                await self.send_my_status(user_id, friend)

    async def update_status(self, user_id, status):
        """ Update self.user_status map.\n
        If user was pending and goes offline, we have to report this to mmaking container """
        if status == 'info':
            status = 'online' # user wanted infos but is online
        if status == "offline" and self.user_status.get(user_id) == "pending":
            await self.redis_client.publish(self.info_group, json.dumps({
                "user_id": user_id,
                "status": "offline"
            }))
        self.user_status[user_id] = status # Update current user status
        print(f"User {user_id} is now {status}")

    async def get_info_process(self, data):
        user_id = data.get('user_id')
        if user_id:
            status = self.user_status.get(user_id, "offline")
        key = f"user_{user_id}_status"
        print(f"publish info : {key, status}")
        await self.redis_client.set(key, status, ex = 2)

    def get_friend_list(self, user_id):
        """ Request friendlist from container 'users' """
        response = requests.get(f"http://users:8000/api/v1/users/{user_id}/friends/")
        if response.status_code == 200:
            try:
                data = response.json()
                return data.get('friends')
            except ValueError as e:
                print("Erreur lors de la conversion en JSON :", e)
        else:
            print(f"Error {response.status_code}")
            return None

    async def send_me_my_friends_status(self, user_id, friends):
        """ publish status of all friends and adress them to 'user_id' """
        for friend in friends:
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
            # print(f"getting my friends status : {data}")
            await self.redis_client.publish(self.gateway_group, json.dumps(data))

    async def send_my_status(self, user_id, friend):
        """ publish status of 'user_id' and adress it to 'friend' """
        data = {
            "header": {
                "service": "social",
                "dest": "front",
                "id": friend
            },
            "body":{
                "user_id": user_id,
                "status": self.user_status.get(user_id, "offline")
            }
        }
        # print(f"Publishing my status to my online friends: {data}")
        await self.redis_client.publish(self.gateway_group, json.dumps(data))

    def signal_handler(self, sig, frame):
        try:
            self.listen_task.cancel()
        except Exception as e:
            print(e)
        self.running = False

    async def cleanup_redis(self):
        print("Cleaning up Redis connections...")
        if self.pubsub:
            await self.pubsub.unsubscribe(self.gateway_group)
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()