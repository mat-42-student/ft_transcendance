from random import randint, choice
from time import time
from json import dumps
from asyncio import sleep as asleep
from .const import LEFT, RIGHT, HEIGHT, WIDTH, PADWIDTH, RADIUS

class Player:

    def __init__(self, name, id):
        self.name = name
        self.id = id
        self.score = 0
        self.pos = (HEIGHT - PADWIDTH) / 2
        self.move = 0

    def set_move(self, move):
        self.move = int(move)
        if (self.move < 0 and self.pos <= 0):
            self.move = 0
        if (self.move > 0 and self.pos + PADWIDTH >= HEIGHT):
            self.move = 0

    def move_paddle(self):
        self.pos += self.move * 2

    def score_up(self):
        self.score = self.score +1
        if self.score == 100:
            return 1

class Game:

    def __init__(self, game_id, id1, id2):
        self.players = []
        self.over = False
        self.id = game_id
        self.speed = 1
        self.players.append(Player(id1, id1))
        self.players.append(Player(id2, id2))
        print(f"New game {game_id} launched : {self.players[0].name} vs {self.players[1].name}")
        self.ball_pos = [WIDTH / 2, HEIGHT / 2]
        self.ball_spd = [self.random_neg_or_not_number(2, 5),
                         self.random_neg_or_not_number(2, 5)]

    def reset_ball(self):
        self.ball_pos = [WIDTH / 2, HEIGHT / 2]
        self.ball_spd = [self.random_neg_or_not_number(2, 5),
                         self.random_neg_or_not_number(2, 5)]

    '''Must have a < b'''
    def random_neg_or_not_number(self, a, b) -> int:
        if choice([True, False]):
            return randint(-b, -a)
        else:
            return randint(a, b)

    async def move_ball(self, wsh):
        # move
        self.ball_pos[0] += self.ball_spd[0] * self.speed
        self.ball_pos[1] += self.ball_spd[1] * self.speed
        # top / bottom collision
        if (self.ball_pos[1] - RADIUS <= 0 or self.ball_pos[1] + RADIUS >= HEIGHT):
            self.ball_spd[1] *= -1
        # left / right collision
        if (self.ball_pos[0] - RADIUS <= 20):
            await self.side_collision(LEFT, wsh)
        if (self.ball_pos[0] + RADIUS >= WIDTH - 20):
            await self.side_collision(RIGHT, wsh)

    # add ball radius !
    async def side_collision(self, side, wsh):
        # check paddle collision
        if self.players[side].pos < self.ball_pos[1] < self.players[side].pos + PADWIDTH :
            self.ball_spd[0] *= -1
            return
        # if ball go through score and check endmatch
        if self.players[1 - side].score_up():
            self.over = True
        self.reset_ball()
        await wsh.channel_layer.group_send(
            wsh.room_group_name, {"type": "handle.message", "message": self.get_game_state()}
        )

    def set_player_move(self, id, move):
        self.players[id].set_move(move)

    def move_players(self):
        for player in self.players:
            player.move_paddle()

    def get_game_state(self):
        return dumps({
            "action":"info",
            "ball": self.ball_pos,
            "ball_dir": self.ball_spd,
            "lpos": self.players[0].pos,
            "rpos": self.players[1].pos,
            "lscore": self.players[0].score,
            "rscore": self.players[1].score,
        })

    async def play(self, wsh):
        target_fps = 60
        fps = 0
        frame_duration = 1 / target_fps  # Durée par frame en secondes (environ 0.01667)

        last_frame_time = time()

        while not self.over:
            current_time = time()
            elapsed_time = current_time - last_frame_time
            if elapsed_time < frame_duration:
                await asleep(frame_duration - elapsed_time)
            fps += 1
            if (fps >= 60):
                fps = 0
            await wsh.channel_layer.group_send(
                wsh.room_group_name, {"type": "handle.message", "message": self.get_game_state()}
            )

            # await wsh.publish(self.get_game_state())
            last_frame_time = time()

            self.move_players()
            await self.move_ball(wsh)
        self.end_game()
    
    def end_game(self):
        print(f"Game over {self.players[0].name}:{self.players[0].score} - {self.players[1].name}:{self.players[1].score}")