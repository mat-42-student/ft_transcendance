import json
import requests
from signal import signal, SIGTERM, SIGINT
from django.core.management.base import BaseCommand
from redis.asyncio import from_url
from asyncio import run as arun, sleep as asleep, create_task
import os
from django.conf import settings
from django.core.cache import cache
from redis.asyncio import Redis
import jwt
from datetime import datetime, timedelta, timezone
class Command(BaseCommand):
    help = "Listen to 'deep_chat' pub/sub redis channel"

    def handle(self, *args, **kwargs):
        signal(SIGINT, self.signal_handler)
        signal(SIGTERM, self.signal_handler)
        arun(self.main())

    async def main(self):
        self.running = True
        try:
            REDIS_PASSWORD = settings.REDIS_PASSWORD

            self.redis_client = await from_url(f"redis://:{REDIS_PASSWORD}@redis:6379", decode_responses=True)

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
        exp = data['header']['id']
        recipient = data['body']['to']
        try:
            if await self.is_muted(exp, recipient):
                data['body']['message'] = "You have been muted"
            elif not await self.is_friend(exp, recipient):
                data['body']['message'] = "You are not friends"
            else:
                data['body']['from'] = exp
                data['header']['id'] = recipient
                del data['body']['to']
        except Exception as e:
            print(e)
            data['body']['message'] = str(e)
        await self.redis_client.publish(self.group_name, json.dumps(data))

    async def is_friend(self, exp, recipient) -> bool :
        friends_data = self.get_friend_list(recipient)
        if not friends_data:
            return False
        friends = [item['id'] for item in friends_data]
        return exp in friends

    def get_friend_list(self, user_id):
        """ Request friendlist from container 'users' """
        try:
            payload = {
                "service": "chat",
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
                cert=("/etc/ssl/chat.crt", "/etc/ssl/chat.key"),
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

    async def is_muted(self, exp, recipient) -> bool :
        """is exp muted by recipient ? Raises an UserNotFoundException if recipient doesnt exist"""
        
        payload = {
            "service": "chat",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=120),
        }
        
        token = jwt.encode(
            payload,
            settings.BACKEND_JWT["PRIVATE_KEY"],
            algorithm=settings.BACKEND_JWT["ALGORITHM"],
        )

        url = f"https://nginx:8443/api/v1/users/{recipient}/blocks/"
        headers = {"Authorization": f"Service {token}"}

        response = requests.get(
            url,
            headers=headers,
            timeout=10,
            cert=("/etc/ssl/chat.crt", "/etc/ssl/chat.key"),
            verify="/etc/ssl/ca.crt"
        )

        if response.status_code == 200:
            try:
                data = response.json()
                if not isinstance(data, list):
                    raise ValueError("Invalid JSON response")
                if any(d['id'] == exp for d in data):
                    return True
            except requests.exceptions.RequestException as e:
                print(f"Error in request : {e}")
            except ValueError as e:
                print("JSON conversion error :", e)
        else:
            print(f"Request failed (status {response.status_code})")
        return False

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