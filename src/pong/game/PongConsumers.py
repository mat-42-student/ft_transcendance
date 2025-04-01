import json
# import jwt
# import requests
import time
from asyncio import create_task, sleep as asleep
from redis.asyncio import from_url #type: ignore
from channels.generic.websocket import AsyncWebsocketConsumer #type: ignore
# from urllib.parse import parse_qs
from .Game import Game
from .const import RESET, RED, YELLOW, GREEN, LEFT, RIGHT
import time
from collections import deque

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
        self.side = None
        self.room_group_name = None
        self.mute = False
        self.public_key = None
        self.redis_client = None
        self.pubsub = None
        self.connected = False
        self.message_timestamps = deque(maxlen=self.MESSAGE_LIMIT)

    async def connect(self):
        self.init()
        if not self.scope["payload"]:
            print("1")
            await self.kick(message="Unauthentified")
            return
        self.get_user_infos()
        if self.player_id is None:
            print("2")
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

    # def checkAuth(self):
    #     try:
    #         self.get_public_key()
    #     except RuntimeError as e:
    #         raise e
    #     params = parse_qs(self.scope['query_string'].decode())
    #     self.token = params.get('t', [None])[0]
    #     try:
    #         payload = jwt.decode(self.token, self.public_key, algorithms=['RS256'])
    #         return payload
    #     except jwt.ExpiredSignatureError as e:
    #         print(e)
    #     except jwt.InvalidTokenError as e:
    #         print(e)
    #     return None

    # def get_public_key(self):
    #     try:
    #         response = requests.get(f"http://auth:8000/api/v1/auth/public-key/")
    #         if response.status_code == 200:
    #             self.public_key = response.json().get("public_key")
    #         else:
    #             raise RuntimeError("Impossible de récupérer la clé publique JWT")
    #     except RuntimeError as e:
    #         print(e)
    #         raise(e)

    async def join_redis_channels(self):
        try:
            self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            # await self.pubsub.subscribe()  # Subscribe all channels
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
            await self.kick(close_code=1011, message="Internal error")
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
        try:
            # await self.redis_client.delete(f"game_{self.game_id}_players")
            await self.send(text_data=json.dumps({"action": "disconnect"}))
        except Exception as e:
            # print(e)
            pass
        finally:
            self.connected = False
            # await self.send_online_status('online')
            await self.close(code=close_code)

    async def load_valid_json(self, data):
        if len(data.encode("utf-8")) > self.MAX_MESSAGE_SIZE:
            self.mute = True
            return
        try:
            data = json.loads(data)
            if "action" not in data:
                raise Exception()
            data["side"] = self.side
            if data["action"] == "wannaplay!":
                data["username"] = self.player_name
                data["id"] = self.player_id
                return data
            if data["action"] == "move":
                if "key" not in data or data["key"] not in [-1, 0, 1]:
                    raise Exception()
                return data
            # If we get to this point, we received a packet that we don't know.
            # Write a new if statement to properly validate it.
            raise Exception()
        except:
            await self.kick(1003, "Invalid JSON")
            return

    async def handle_message(self, data):
        data = data.get("message")
        # print(f'handle data {type(data)}, {data}')
        if not data:
            return
        if data["action"] == "move":
            return await self.moveplayer(data)
        if data["action"] == "init":
            return await self.launch_game(data)
        if data["action"] == "info":
            return await self.send(json.dumps(data))
        if data["action"] == "wannaplay!":
            print("wannaplay: ", data)
            return await self.wannaplay(data.get("id"), data.get("username"))

    async def wannaplay(self, opponent_id, opponent_name):
        # print(f"{GREEN}Player {self.player_id}({self.player_name}) wants to play with {opponent_id}({opponent_name}){RESET}")
        self.nb_players += 1
        if self.player_id < opponent_id:
            self.master = True
            self.opponent_id = opponent_id
            self.opponent_name = opponent_name
        if self.nb_players != 2 or not self.master:
            return
        self.game = Game(self.game_id, self.player_id, self.player_name, self.opponent_id, self.opponent_name, self)
        json_data = {
            "action" : "init",
            "dir" : self.game.ball_speed,
            "lplayer": self.game.players[LEFT].name,
            "rplayer": self.game.players[RIGHT].name,
            "lpos":self.game.players[LEFT].pos,
            "rpos":self.game.players[RIGHT].pos,
        }
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "handle.message", "message": json_data}
        )

    async def launch_game(self, data):
        self.side = LEFT if self.master else RIGHT # master player == player[0] == left player
        data.update({ "side": str(self.side) })
        try:
            await self.send(json.dumps(data))
        except:
            pass
        if self.master:
            create_task(self.game.play())

    async def wait_a_bit(self, data):
        time = data.get('time', 1)
        await self.send(json.dumps({"action":"wait", "time":time}))

    async def moveplayer(self, message):
        if self.master: # transmit move to game engine
            self.game.players[message["side"]].move = message["key"]

    # client ws was closed, sending disconnection to other client
    async def disconnect(self, close_code):
        print(f"{YELLOW}Player {self.player_id} disconnecting{RESET}")
        if not self.connected:
            # await self.send_online_status('online')
            return
        who = "master" if self.master else "guest"
        print(f"{RED}Player {self.player_id}({who}) has left{RESET}")
        if self.master and self.game and not self.game.over:
            print(f"{RED}Game #{self.game.id} over (player {self.player_id} left){RESET}")
            await self.disconnect_endgame(self.player_id)
        if self.room_group_name:
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "disconnect.now", "side": self.player_id}
            )
        # await self.send_online_status('online')

    async def disconnect_now(self, event):
    # If self.game.over, game was stopped beacuse maxscore has been reached
    # If not, game was stopped because one player left
        if not self.connected:
            return
        self.connected = False
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        print(f"Disco_now event: {event}")
        user = event.get("side")
        print(f"{YELLOW}Disconnect_now from {user}{RESET}")
        if user is None:
            await self.kick(message="Disconnect_now")
            return
        if self.master and self.game.over: # game ended normally
            print(f"{RED}Game #{self.game.id} over (maxscore reached){RESET}")
            await self.send_score()
        elif self.master and not self.game.over: # game is ending because one player left
            print(f"{RED}Game #{self.game.id} over (player {user} left){RESET}")
            await self.disconnect_endgame(user)
        try:
            await self.send(text_data=json.dumps({"action": "disconnect"}))
        except Exception as e:
            print(e)

    async def disconnect_endgame(self, user):
        self.game.players[0].score = 1 if self.player_id != user else 0
        self.game.players[1].score = 1 - self.game.players[0].score
        self.game.over = True
        print(f"{RED}Player {user} left")
        await self.send_score()
        self.game = None

    async def send_score(self):
        score = self.game.get_score()
        await self.redis_client.publish("info_mmaking", json.dumps(score))