import json
import requests
from signal import signal, SIGTERM, SIGINT
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep, create_task
# from datetime import datetime, timezone
# from models import User, BlockedUser

class Command(BaseCommand):
    help = "Listen to 'deep_chat' pub/sub redis channel"

    def handle(self, *args, **kwargs):
        signal(SIGINT, self.signal_handler)
        signal(SIGTERM, self.signal_handler)
        arun(self.main())

    async def main(self):
        self.running = True
        try:
            self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            self.group_name = "deep_chat"
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
            if msg :
                try:
                    data = json.loads(msg['data'])
                    if self.valid_chat_json(data):
                        await self.process_message(data)
                    # else:
                    #     print(f"Error parsing : {data}")
                except Exception as e:
                    print(e)

    def valid_chat_json(self, data):
        if data['header']['dest'] != 'back' or data['header']['service'] != 'chat':
            return False
        data = data.get('body')
        if not isinstance(data, dict):
            return False
        if "message" not in data or "to" not in data:
            return False
        return True

    async def process_message(self, data):
        data['header']['dest'] = 'front' # data destination after deep processing
        print(f"getting {data['body']}")
        # if self.recipient_exists(data['body']['to']):
        try:
            if self.is_muted(data['header']['id'], data['body']['to']):
                data['body']['message'] += f"You were muted by {data['body']['to']}"
            else:
                data['body']['from'] = data['header']['id']
                data['header']['id'] = data['body']['to'] # username OR userID
                del data['body']['to']
                data['body']['message'] += '(back from chat)'
        except Exception as e:
            print(e)
            data['body']['message'] = str(e)
        print(f"Sending back : {data}")
        await self.redis_client.publish(self.group_name, json.dumps(data))

    def is_muted(self, exp, recipient) -> bool :
        """is exp muted by recipient ? Raises an UserNotFoundException if recipient doesnt exist"""
        response = requests.get(f"http://users:8000/api/v1/users/{recipient}/blocks/")
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('error'):
                    raise ValueError("Recipient not found")
                blocked_users = data.get('blocked_users')
                if blocked_users and exp in blocked_users:
                  return True
            except requests.exceptions.RequestException as e:
                print(f"Error in request : {e}")
            except ValueError as e:
                print("JSON conversion error :", e)
        else:
            print(f"Request failed (status {response.status_code})")
        return False

    # def recipient_exists(self, user):
    #     """Does user exist ?"""
    #     url = f""
    #     print(url)
    #     response = requests.get(url)
    #     # response = requests.get(f"http://users:8000/api/v1/users/151/blocks/")
    #     if response.status_code == 200:
    #         try:
    #             data = response.json()
    #             print(f"data {data}")
    #             if data.get('id') == user:
    #               return True
    #             return False
    #         except requests.exceptions.RequestException as e:
    #             print(f"Error in request : {e}")
    #         except ValueError as e:
    #             print("JSON conversion error :", e)
    #     else:
    #         print(f"Request failed (status {response.status_code})")
    #     return False

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