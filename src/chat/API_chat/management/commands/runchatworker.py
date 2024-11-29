import json
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep
from signal import SIGTERM, SIGINT

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
            if msg :
                await self.process_message(json.loads(msg["data"]))

    async def process_message(self, data):
        if data['dc'] != 'chat':
            return
        if data['dest'] != 'back':
            return
        data['dest'] = 'front'
        data['message'] += '(back from chat)'
        await self.redis_client.publish(self.group_name, json.dumps(data))

    async def cleanup(self):
        print("Cleaning up Redis connections...")
        await self.pubsub.unsubscribe()
        await self.pubsub.close()
        await self.redis_client.close()