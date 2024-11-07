import json
from asyncio import create_task
from .Game import Game
from .const import RESET, RED, YELLOW, GREEN, LEFT, RIGHT
from channels.generic.websocket import AsyncJsonWebsocketConsumer # type: ignore
from .models import User, Salon, Mode

class PongConsumer(AsyncJsonWebsocketConsumer):

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.player_id = None
        self.game_id = None
        self.nb_players = 0
        self.in_game = False
        self.master = False
        self.game = None
        self.side = None
        self.game_mode = None

    async def connect(self):
        self.game_id = self.scope["url_route"]["kwargs"]["game_id"]
        self.room_group_name = f"game_{self.game_id}"

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    # Receive message from WebSocket (from client): immediate publish into lobby
    async def receive(self, text_data):
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "handle.message", "message": text_data}
        )

    async def handle_message(self, data):
        data = json.loads(data["message"])
        if data["action"] == "move":
            return await self.moveplayer(data)
        if data["action"] == "init":
            return await self.launch_game(data)
        if data["action"] == "info":
            return await self.send(json.dumps(data))
        if data["action"] == "wannaplay!":
            return await self.wannaplay(data["from"])

    async def get_and_check_info_from_db(self, player):
        # TODO : check from database if player (identified from his JWT) is in actual lobby
        # DONE : then get lobby's mode
        # print(f"{GREEN}getAndCheck. game_id: {self.game_id}{RESET}")
        try:
            self.salon = await Salon.objects.aget(id=self.game_id)
            self.mode = await Mode.objects.aget(salon=self.salon)
            self.game_mode = self.mode.mode
            print(f"{YELLOW}{self.salon}{RESET}")
            print(self.mode)
            return 1 
        except:
            print(f"{RED}No lobby matching id={self.game_id}{RESET}")
            return 0

    async def wannaplay(self, player):
        self.nb_players += 1
        if self.player_id is None:
            self.player_id = player
        allgood = await self.get_and_check_info_from_db(player)
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

    # async def normal_endgame(self, event):
    # # maxscore was reached (and we are master here)
    #     await self.game.save_score()
    #     await self.channel_layer.group_send(
    #         self.room_group_name, {"type": "disconnect.now", "from": "server (game over)"}
    #     )

    async def disconnect(self, close_code):
    # client wws was closed, sending disconnection to other client
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "disconnect.now", "from": self.player_id}
        )
        who = "master" if self.master else "guest"
        print(f"{RED}Player {self.player_id}({who}) has left{RESET}")

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