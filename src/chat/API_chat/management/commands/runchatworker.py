import json
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep
from signal import SIGTERM, SIGINT
from cerberus import Validator
# from models import User, BlockedUser

class Command(BaseCommand):
    help = "Listen to 'deep_chat' pub/sub redis channel"

    def handle(self, *args, **kwargs):
        arun(self.main())

    def get_validator(self):
        schema = {
            'header': {
                'type': 'dict',
                'schema': {
                    'from': {'type': 'string', 'required': True},
                    'to': {'type': 'string', 'required': True},
                    'id': {'type': 'string', 'required': True}
                },
                'required': True
            },
            'body': {
                'type': 'dict',
                'schema': {
                    'to': {'type': 'string', 'required': True},
                    'message': {'type': 'string', 'required': True}
                },
                'required': True
            }
        }
        v = Validator(schema)
        return v

    async def main(self):
        self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
        self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
        self.group_name = "deep_chat"
        self.json_validator = self.get_validator()

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
                data = json.loads(msg["data"])
                if data['header']['to'] == 'chat':
                    await self.process_message(data)

    async def process_message(self, data):
        # if not self.json_validator.validate(data):
        #     print("Invalid format")
        #     return
        data['header']['to'] = 'client'
        if self.recipient_exists(data['body']['to']):
            if self.was_muted(data):
                data['body']['message'] += f"You were muted by {data['body']['to']}"
            else:
                data['header']['id'] = data['body']['to'] # username OR userID ?
                data['body']['message'] += '(back from chat)'
        else:
            data['body']['message'] += 'User not found'
        await self.redis_client.publish(self.group_name, json.dumps(data))

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