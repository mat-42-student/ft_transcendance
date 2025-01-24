from django.core.management.base import BaseCommand
from redis.asyncio import from_url
import json
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
			self.channel_front = "deep_mmaking"
			self.channel_social = "info_social"
			print(f"Subscribing to channel: {self.channel_front}")
			await self.pubsub.subscribe(self.channel_front)
			await self.pubsub.subscribe(self.channel_social)
			self.listen_task = create_task(self.listen())
			while self.running:
				await asleep(1)
		except Exception as e:
			print(e)
		finally:
			await self.cleanup_redis()

	async def listen(self):
		self.user = {}
		self.message = None
		print("Listening for messages...")
		async for msg in self.pubsub.listen():
			if msg : #and msg['type'] == 'message':  # Filtre uniquement les messages réels
				message = json.loads(msg.get('data'))
				newPlayer = await matchmaking(msg)

				self.parse_typeGame(message)
				self.user.update(newPlayer)

				for key, value in self.user.items():
					print(f'Userid {key}, {value} \n')

	
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

	async def check_statusPlayer(player):
		response_timeout = 2
		data = {
			'user_id': player.id
		}
		self.redis_client.publish(self.channel_social, json.dumps(data))
		while (response_timeout > 0)
			status = await self.redis_client.get(player.id)
			if (status)
				return (status)
			asleep(0.5)
			reponse_timeout -= 0.5
		return (None)

	def setup_statusPlayer(player)
		data = {
			'header':{
				'service': 'social'
				'dest': 'back'
				'id': player.id,
			},
			'body':{
				'status': 'pending',
				'status': 'test'
			}
		}
		player.status = 'pending'
		self.redis_client.pubish(channel_front, json.dumps(data))

	def parse_typeGame(message, newPlayer):
	{
		# Check the content of body
		if (message.get('body') && message['body'].get('type_game') && message['body'].get('status')):
			# Check the status of Player
			if (check_statusPlayer(newPlayer) == 'online')
				setup_statusPlayer(player)
					
	}