import json
import requests
import time
from asyncio import create_task, sleep as asleep, CancelledError
from redis.asyncio import from_url #type: ignore
from channels.generic.websocket import AsyncWebsocketConsumer #type: ignore
from .Game import Game
from .const import RESET, RED, YELLOW, GREEN, LEFT, RIGHT, LEVELS
from collections import deque
import random
import math
from django.conf import settings

class InvalidPacket(Exception):
    pass

class PongConsumer(AsyncWebsocketConsumer):
    # Anti-flood system
    MESSAGE_LIMIT = 20 # each player input counts 2 (keydown and keyup)
    TIME_WINDOW = 1 # seconds
    UNMUTE_TIME = 5 # seconds
    MAX_MESSAGE_SIZE = 50

    WAITING_FOR_OPPONENT = 10 # seconds

    def init(self):
        self.player_id = None
        self.player_name = None
        self.opponent_id = None
        self.opponent_name = None
        self.game_id = None
        self.nb_players = 0
        self.master = False
        self.game = None
        self.task = None
        self.side = None
        self.room_group_name = None
        self.mute = False
        self.public_key = None
        self.redis_client = None
        self.pubsub = None
        self.connected = False
        self.loaded = [False, False]
        self.message_timestamps = deque(maxlen=self.MESSAGE_LIMIT) # collecting message's timestamp

    async def connect(self):
        self.init()
        if not self.scope["payload"]:
            await self.kick(message="Unauthentified")
            return
        self.get_user_infos()
        if self.player_id is None:
            await self.kick(message="Unauthentified")
            return
        try:
            await self.join_redis_channels()
            if not await self.check_game_info():
                await self.close()
                return
            await self.accept()
            self.connected = True
            self.room_group_name = f"game_{self.game_id}"
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.wait_for_opponent()
        except Exception as e:
            print(e)

    async def wait_for_opponent(self):
        try:
            key = f"ping{self.game_id}"
            await self.redis_client.incr(key)
            await self.redis_client.expire(key, self.WAITING_FOR_OPPONENT)
        except Exception as e:
            await self.kick(message="Error while waiting for opponent")
            return
        start_time = time.time()
        while time.time() - start_time < self.WAITING_FOR_OPPONENT:
            try:
                nb_players = await self.redis_client.get(key)
            except Exception as e:
                print(e)
            if nb_players == '2':
                return
            await asleep(0.5)
        await self.kick(message="No opponent found")

    def get_user_infos(self):
        try:
            data = self.scope["payload"]
            if data:
                self.player_id =  data.get('id')
                self.player_name = data.get('username')
                print(f"User {self.player_id} is authenticated as {self.player_name}")
        except RuntimeError as e:
            print(e)
            return

    def get_public_key(self):
        try:
            url = "https://nginx:8443/api/v1/auth/public-key/"
            response = requests.get(
                url,
                timeout=10,
                cert=("/etc/ssl/pong.crt", "/etc/ssl/pong.key"),
                verify="/etc/ssl/ca.crt"
            )

            if response.status_code == 200:
                self.public_key = response.json().get("public_key")
            else:
                raise RuntimeError("Impossible de récupérer la clé publique JWT")
        except RuntimeError as e:
            print(e)
            raise(e)

    async def join_redis_channels(self):
        try:
            REDIS_PASSWORD = settings.REDIS_PASSWORD

            self.redis_client = await from_url(f"redis://:{REDIS_PASSWORD}@redis:6379", decode_responses=True)
            
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
        except Exception as e:
            raise Exception

    async def check_game_info(self):
        # ask mmaking for expected players in game_id
        self.game_id = self.scope["url_route"]["kwargs"]["game_id"]
        data = {"game_id": self.game_id}
        await self.redis_client.publish("info_mmaking", json.dumps(data))
        expected_players = None
        attempts = 0
        while expected_players is None and attempts < 5:
            attempts += 1
            expected_players = await self.redis_client.get(f"game_{self.game_id}_players")
            await asleep(0.5)
        if expected_players is None:
            await self.kick(close_code=1011, message="Player not expected on this game")
            return
        try:
            expected_players = json.loads(expected_players)
            if not isinstance(expected_players, list):
                await self.kick(close_code=1009, message="Bad answer from mmaking")
                return
        except json.JSONDecodeError as e:
            await self.kick(close_code=1009, message="Invalid JSON")
            return
        if self.player_id not in expected_players:
            await self.kick(message=f"{self.player_name}: Unexpected player")
            return
        return True

    # return True if user has sent more than MESSAGE_LIMIT in TIME_WINDOW seconds
    async def user_flooding(self):
        current_time = time.time()
        self.message_timestamps.append(current_time)
        if len(self.message_timestamps) >= self.MESSAGE_LIMIT:
            if current_time - self.message_timestamps[0] <= self.TIME_WINDOW:
                return True
        return False

    def unmute_if_expired(self):
        if self.message_timestamps[0] + self.UNMUTE_TIME < time.time():
            self.mute = False

    # Receive message from WebSocket: immediate publish into channels lobby
    async def receive(self, text_data=None, bytes_data=None):
        if self.mute:
            self.unmute_if_expired()
            return
        if await self.user_flooding():
            self.mute = True
            return
        data = await self.load_valid_json(text_data)
        if not (data):
            return
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "handle.message", "message": data}
        )

    async def kick(self, close_code=1008, message="Policy Violation"):
        print(RED, self.player_name, message, RESET)
        await self.safe_send(json.dumps({"action": "disconnect"}))
        if self.game != None:
            await self.safe_send(json.dumps({"action": "game_cancelled"}))
        self.connected = False
        await self.close(code=close_code)

    async def load_valid_json(self, data):
        if len(data.encode("utf-8")) > self.MAX_MESSAGE_SIZE:
            self.mute = True
            return None
        try:
            data = json.loads(data)
            if "action" not in data:
                raise InvalidPacket("Missing 'action' field")
            data["side"] = self.side
            if data["action"] == "wannaplay!":
                data["username"] = self.player_name
                data["id"] = self.player_id
                return data
            if data["action"] == "move":
                if data.get("key") not in (-1, 0, 1):
                    raise InvalidPacket(f"Invalid key value: {data.get('key')}")
                return data
            if data["action"] == "load_complete":
                if data.get("side") not in (0, 1):
                    raise InvalidPacket(f"Invalid side value: {data.get('side')}")
                return data
            raise InvalidPacket(f"Unknown action: {data['action']}")
        except (json.JSONDecodeError, InvalidPacket) as e:
            print(f"{RED}Json error: {e} | data: {data}{RESET}")
            return None

    async def safe_send(self, data):
        try:
            await self.send(data)
        except Exception as e:
            print(f"{RED}Error while sending data: {e}{RESET}")

    async def handle_message(self, data):
        data = data.get("message")
        if not data:
            return
        if data["action"] == "move":
            return await self.moveplayer(data)
        if data["action"] == "load_complete":
            self.loaded[data['side']] = True
            if self.master and self.game:
                self.game.loaded = self.loaded[0] and self.loaded[1]
            return
        if data["action"] == "init":
            return await self.launch_game(data)
        if data["action"] == "info":
            return await self.safe_send(json.dumps(data))
        if data["action"] == "wannaplay!":
            return await self.wannaplay(data.get("id"), data.get("username"))

    async def wannaplay(self, opponent_id, opponent_name):
        self.nb_players += 1
        if self.player_id < opponent_id:
            self.master = True
            self.opponent_id = opponent_id
            self.opponent_name = opponent_name
        if self.nb_players != 2 or not self.master:
            return
        level_name = self.random_level_name()
        self.game = Game(self.game_id, self.player_id, self.player_name, self.opponent_id, self.opponent_name, self, level_name)
        json_data = {
            "action" : "init",
            "dir" : self.game.ball_speed,
            "lplayer": self.game.players[LEFT].name,
            "rplayer": self.game.players[RIGHT].name,
            "lpos":self.game.players[LEFT].pos,
            "rpos":self.game.players[RIGHT].pos,
            "level_name": level_name,
        }
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "handle.message", "message": json_data}
        )

    def random_level_name(self):
        keys = list(LEVELS.keys())
        random_index = math.floor(len(keys) * random.random())
        level_name = keys[random_index]
        return level_name

    async def launch_game(self, data):
        self.side = LEFT if self.master else RIGHT # master player == player[0] == left player
        data.update({ "side": str(self.side) })
        await self.safe_send(json.dumps(data))
        await self.channel_layer.group_send( # really useful ? Would be better to send rather than group_send
            self.room_group_name, {"type": "handle.message", "message": {"action": "ready"}}
        )
        if self.master:
            self.task = create_task(self.game.play())

    async def wait_a_bit(self, data):
        time = data.get('time', 1)
        await self.safe_send(json.dumps({"action":"wait", "time":time}))

    async def moveplayer(self, message):
        if self.master: # transmit move to game engine
            self.game.players[message["side"]].move = message["key"]

    # client ws was closed, sending disconnection to other client
    async def disconnect(self, close_code):
        if not self.connected:
            return
        if self.room_group_name:
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "disconnect.now"})
        await self.cleanup()

    async def disconnect_now(self, event):
        if not self.connected:
            return
        if not event.get("from"):
            await self.safe_send(json.dumps({"action": "game_cancelled"}))
        await self.safe_send(json.dumps({"action": "disconnect"}))

    async def cleanup(self):
        self.connected = False
        try:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            if self.pubsub:
                self.pubsub.unsubscribe()
                await self.pubsub.close()
                self.pubsub = None
            if self.redis_client:
                await self.redis_client.close()
                self.redis_client = None
        except Exception as e:
            print(f"Erreur lors de la fermeture Redis : {e}")
        if self.master:
            self.game = None
            if self.task and not self.task.done():
                self.task.cancel()
            try:
                await self.task
            except CancelledError:
                pass



    async def send_score(self):
        score = self.game.get_score()
        await self.redis_client.publish("info_mmaking", json.dumps(score))

    async def declare_winner(self, event):
        await self.safe_send(json.dumps({
            "action": "game_won",
            "winner": event["winner"],
            "scores": event["scores"],
        }))
