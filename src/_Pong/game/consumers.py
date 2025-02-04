import json
import jwt
from asyncio import create_task, sleep as asleep
from redis.asyncio import from_url
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from urllib.parse import parse_qs
from .Game import Game
from .const import RESET, RED, YELLOW, GREEN, LEFT, RIGHT, JWT_PUBLIC_KEY

class PongConsumer(AsyncJsonWebsocketConsumer):

    def init(self):
        self.player_id = None
        self.player_name = None
        self.game_id = None
        self.nb_players = 0
        self.in_game = False
        self.master = False
        self.game = None
        self.side = None
        self.game_mode = None

    async def connect(self):
        self.init()
        await self.get_user_infos()
        await self.join_redis_channels()
        await self.check_game_info()
        try:
            await self.accept()
            await self.send_online_status('ingame')
            self.room_group_name = f"game_{self.game_id}"
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        except Exception as e:
            print(e)

    async def get_user_infos(self):
        data = self.checkAuth()
        if data:
            self.player_id =  data.get('id')
            self.player_name = data.get('username')
        if self.player_id is None:
            print("Invalid token. Aborting")
            await self.close(code=4401)
        print(f"User {self.player_id} is authenticated as {self.player_name}")

    def checkAuth(self):
        self.public_key = JWT_PUBLIC_KEY
        params = parse_qs(self.scope['query_string'].decode())
        self.token = params.get('t', [None])[0]
        try:
            payload = jwt.decode(self.token, self.public_key, algorithms=['RS256'])
            return payload
        except jwt.ExpiredSignatureError as e:
            print(e)
        except jwt.InvalidTokenError as e:
            print(e)
        return None

    async def join_redis_channels(self):
        try:
            self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
            self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
            await self.pubsub.subscribe('info_mmaking')
            # await self.pubsub.subscribe('deep_mmaking')
        except Exception as e:
            print(e)

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
            if expected_players is None:
                await asleep(0.5)
        if expected_players is None:
            print("No answer from mmaking")
            await self.close(code=4401)
            return
        try:
            expected_players = json.loads(expected_players)
        except json.JSONDecodeError as e:
            print("Invalid JSON:", e)
            await self.close(code=4401)
            return
        if self.player_id not in expected_players:
            print("Unexpected player")
            await self.close(code=4401)        

    async def disconnect(self, close_code):
            await self.send_online_status('online')

    async def send_online_status(self, status):
        """Send all friends our status"""
        data = {
            "header": {
                "service": "social",
                "dest": "back",
                "id": self.player_id
            },
            "body":{
                "status": status
            }
        }
        # print(f"Sending data to deep_social: {data}")
        await self.redis_client.publish("deep_social", json.dumps(data))

    # Receive message from WebSocket (from client): immediate publish into lobby
    async def receive_json(self, data):
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "handle.message", "message": data}
        )

    async def handle_message(self, data):
        data = data["message"]
        if data["action"] == "move":
            return await self.moveplayer(data)
        if data["action"] == "init":
            return await self.launch_game(data)
        if data["action"] == "info":
            return await self.send(json.dumps(data))
        if data["action"] == "wannaplay!":
            return await self.wannaplay(data["from"])

    async def wannaplay(self, player):
        self.nb_players += 1
        if self.player_id is None:
            self.player_id = player
        allgood = await self.get_and_check_info_from_mmaking(player)
        if not allgood:
            return
        print(f"{self.player_id} wannaplay on channel {self.room_group_name}. Currently {self.nb_players} players in lobby")
        if self.nb_players != 2 or self.in_game:
            return
        self.master = True
        print(f"{YELLOW}Found two players. Master is {self.player_id}{RESET}")
        self.game = Game(self.game_id, self.player_id, player)
        json_data = json.dumps({
            "action" : "init",
            "dir" : self.game.ball_spd,
            "lplayer": self.game.players[LEFT].name,
            "rplayer": self.game.players[RIGHT].name,
            "lpos":self.game.players[LEFT].pos,
            "rpos":self.game.players[RIGHT].pos,
            "mode":self.game_mode,
        })
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "handle.message", "message": json_data}
        )

    async def launch_game(self, data):
        self.in_game = True
        self.side = LEFT if self.master else RIGHT # master player == player[0] == left player
        data.update({ "side": str(self.side) })
        try:
            await self.send(json.dumps(data))
        except:
            pass
        if self.master:
            create_task(self.game.play(self))

    async def moveplayer(self, message):
        if self.master: # transmit move to game engine
            self.game.set_player_move(int(message["from"]), int(message["key"]))
        # players handle their own moves client-side, we only transmit the moves to the opposing player
        if message["from"] != str(self.side):
            try:
                await self.send(message)
            except:
                pass

    # client wws was closed, sending disconnection to other client
    async def disconnect(self, close_code):
        who = "master" if self.master else "guest"
        print(f"{RED}Player {self.player_id}({who}) has left{RESET}")
        if self.master and not self.game.over: # game is ending because master left
            print(f"{RED}Game #{self.game.id} over (player {self.player_id} left){RESET}")        
            await self.disconnect_endgame(self.player_id)
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "disconnect.now", "from": self.player_id}
        )

    async def disconnect_now(self, event):
    # If self.game.over, game was stopped beacuse maxscore has been reached
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        user = event["from"]
        print(f"{YELLOW}Disconnect_now from {user}{RESET}")
        if self.master and self.game.over: # game ended normally
            print(f"{RED}Game #{self.game.id} over (maxscore reached){RESET}")        
            await self.game.save_score()
        elif self.master and not self.game.over: # game is ending because one player left
            print(f"{RED}Game #{self.game.id} over (player {user} left){RESET}")        
            await self.disconnect_endgame(user)
        # if self.player_id != user:
        await self.send(text_data=json.dumps({"action": "disconnect", "from": user}))
        # await self.disconnect(0)

    async def disconnect_endgame(self, user):
        self.game.players[0].score = 10 if self.player_id != user else 0
        self.game.players[1].score = 10 - self.game.players[0].score
        self.game.over = True
        print(f"{RED}Player {user} left")
        await self.game.save_score()
        self.game = None