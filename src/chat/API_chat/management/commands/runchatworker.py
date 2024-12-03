import json
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep
from signal import SIGTERM, SIGINT
# from cerberus import Validator
# from models import User, BlockedUser

class Command(BaseCommand):
    help = "Listen to 'deep_chat' pub/sub redis channel"

    def handle(self, *args, **kwargs):
        arun(self.main())

    async def main(self):
        self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
        self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
        self.group_name = "deep_chat"
       

        print(f"Subscribing to channel: {self.group_name}")
        await self.pubsub.subscribe(self.group_name)
        try:
            await self.listen()
        finally:
            await self.cleanup()

    async def listen(self):
        print(f"Listening for messages...")
        async for msg in self.pubsub.listen():
            if msg.get('data') :
                try:
                    data = json.loads(msg["data"])
                    if data['header']['to'] == 'chat':
                        await self.process_message(data)
                except:
                    pass

    def valid_json(self, data):
        data = data.get('body')
        if not(data):
            return False
        if not (data.get('message') and data.get('to')):
            return False
        return True

    async def process_message(self, data):
        if not self.valid_json(data):
            return
        data['header']['to'] = 'client'
        if self.recipient_exists(data['body']['to']):
            if self.was_muted(data):
                data['body']['message'] += f"You were muted by {data['body']['to']}"
            else:
                data['header']['from'] = data['body']['to'] # username OR userID ?
                data['body']['message'] += '(back from chat)'
        else:
            data['body']['message'] += 'User not found'
        await self.redis_client.publish(self.group_name, json.dumps(data))
        print(f"Publishing : {data}")

    def was_muted(self,data) -> bool :
        # Check db relationship
        return False

    def recipient_exists(self, user):
        return True

    async def cleanup(self):
        print("Cleaning up Redis connections...")
        await self.pubsub.unsubscribe()
        await self.pubsub.close()
        await self.redis_client.close()