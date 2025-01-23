from django.core.management.base import BaseCommand
from redis.asyncio import from_url
import asyncio
from .matchmaking import matchmaking
from asyncio import run as arun, sleep as asleep, create_task
from signal import signal, SIGTERM, SIGINT

class Command(BaseCommand):
	help = "Commande pour écouter un canal Redis avec Pub/Sub"   

	def handle(self, *args, **kwargs):
		signal(SIGINT, self.signal_handler)
		signal(SIGTERM, self.signal_handler)
		arun(self.main())

	async def main(self):
		self.running = True
		try:
			self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
			self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
			self.group_name = "deep_mmaking"        
			print(f"Subscribing to channel: {self.group_name}")
			await self.pubsub.subscribe(self.group_name)
			self.listen_task = create_task(self.listen())
			while self.running:
				await asleep(1)
		except Exception as e:
			print(e)
		finally:
			await self.cleanup_redis()

	async def listen(self):
		self.user = {}
		print("Listening for messages...")
		async for msg in self.pubsub.listen():
			if msg : #and msg['type'] == 'message':  # Filtre uniquement les messages réels
				value = await matchmaking(msg)
				self.user.update(value)
				print(f"Message received: {msg['data']}")
				for key, value in self.user.items():
					print(f'dictionnaire user {key}, {value}')
	
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