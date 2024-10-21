import json
from asyncio import create_task
from .Game import Game
from .const import RESET, RED, YELLOW, GREEN, LEFT, RIGHT
from channels.generic.websocket import AsyncJsonWebsocketConsumer # type: ignore


class PongConsumer(AsyncJsonWebsocketConsumer):

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.nb_players = 0
        self.in_game = False
        self.master = False
        self.game = None
        self.side = None
        self.player_id = None
        self.game_id = None
        self.player_id = None

    async def connect(self):
        self.game_id = self.scope["url_route"]["kwargs"]["game_id"]
        self.player_id = self.scope["url_route"]["kwargs"]["player_id"]
        self.room_group_name = f"game_{self.game_id}"

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    # Receive message from WebSocket : immediate publishing to lobby
    async def receive(self, text_data):
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "handle.message", "message": text_data}
        )

    async def handle_message(self, data):
        # print(f"handle:{RED}{data}{RESET}")
        data = json.loads(data["message"])

        if data["action"] == "move":
            return await self.moveplayer(data)
        if data["action"] == "info":
            return await self.send(json.dumps(data))
        if data["action"] == "init":
            return await self.launch_game(data)
        if data["action"] == "wannaplay!":
            return await self.wannaplay(data["from"])

    async def wannaplay(self, player):
        if self.in_game :
            return
        self.nb_players += 1
        # print(f"{self.player_id} wannaplay on channel {self.room_group_name}. Currently {self.nb_players} players in lobby")
        if self.nb_players == 2:
            self.master = True
            # print(f"{YELLOW}Found two players. Master is {self.player_id}{RESET}")
            self.game = Game(self.game_id, self.player_id, player)
            json_data = json.dumps({
                "action" : "init",
                "dir" : self.game.ball_spd,
                "lplayer": self.game.players[LEFT].name,
                "rplayer": self.game.players[RIGHT].name,
                "lpos":self.game.players[LEFT].pos,
                "rpos":self.game.players[RIGHT].pos
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
        # players handle their own moves client-side, we only transmit the moves to the opposing player.
        if message["from"] != str(self.side):
            try:
                await self.send(message)
            except:
                pass
        return

    async def disconnect(self, close_code):
        if self.master and self.game:
            self.endgame_by_disconnection(self.player_id)
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "get.disconnect", "from": self.player_id}
        )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        # print(f"{RED}Connexion WebSocket fermée par {self.player_id}{RESET}")

    async def get_disconnect(self, event):
        # print(f"{GREEN}Ici {self.player_id}, disco:{event}{RESET}")
        user = event["from"]
        if self.master and self.game:
            self.endgame_by_disconnection(user)
        await self.send(text_data=json.dumps({"action": "disconnect", "from": user}))
        await self.disconnect(0)

    def endgame_by_disconnection(self, user):
        if self.game.over:
            return
        if self.nb_players > 0:
            self.game.players[0].score = 1 if self.player_id != user else 0
            self.game.players[1].score = 1 - self.game.players[0].score
            self.game.over = True
        self.game = None