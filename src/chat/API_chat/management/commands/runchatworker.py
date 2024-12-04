import json
from signal import signal, SIGTERM, SIGINT
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep, create_task
# from cerberus import Validator
# from models import User, BlockedUser

class Command(BaseCommand):
    help = "Listen to 'deep_chat' pub/sub redis channel"

    def handle(self, *args, **kwargs):
        signal(SIGINT, self.signal_handler)
        signal(SIGTERM, self.signal_handler)
        arun(self.main())

    async def main(self):
        try:
            self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            self.group_name = "deep_chat"
            print(f"Subscribing to channel: {self.group_name}")
            await self.pubsub.subscribe(self.group_name)
            self.listen_task = create_task(self.listen())
            while True:
                await asleep(10)
        except  Exception as e:
            print(e)
        finally:
            await self.signal_handler()

    async def listen(self):
        print(f"Listening for messages...")
        async for msg in self.pubsub.listen():
            if msg.get('data') :
                try:
                    data = json.loads(msg["data"])
                    if data['header']['to'] == 'chat':
                        await self.process_message(data)
                except Exception as e:
                    print(e)

    def valid_json_body(self, data):
        if data['header']['side'] != 'back':
            return False
        data = data.get('body')
        if not isinstance(data, dict):
            return False
        if "message" not in data or "to" not in data:
            return False
        return True

    async def process_message(self, data):
        if not self.valid_json_body(data):
            return
        data['header']['side'] = 'front' # data destination after deep processing
        if self.recipient_exists(data['body']['to']):
            if self.is_muted(data['header']['from'], data['body']['to']):
                data['body']['message'] += f"You were muted by {data['body']['to']}"
            else:
                data['header']['from'] = data['body']['to'] # username OR userID ?
                data['body']['message'] += '(back from chat)'
        else:
            data['body']['message'] += 'User not found'
        print(f"Publishing : {data}")
        await self.redis_client.publish(self.group_name, json.dumps(data))
        print(f"Publishing : {data}")

    def is_muted(self, exp, recipient) -> bool :
        """is exp muted by recipient ?"""
        # Check db relationship
        return False

    def recipient_exists(self, user):
        return True

    async def signal_handler(self):
        try:
            self.listen_task.cancel()
        except Exception as e:
            print(e)
        print("Cleaning up Redis connections...")
        if self.pubsub:
            await self.pubsub.unsubscribe(self.group_name)
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()