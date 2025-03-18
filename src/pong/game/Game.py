from random import randint, choice
from time import time
from json import dumps
from asyncio import sleep as asleep
from .const import LEFT, RIGHT, HEIGHT, WIDTH, PADWIDTH, FPS, MAX_SCORE, GREEN, RED, RESET, DELTATIME, PADMINIMUM, PADSHRINK

class Player:

    def __init__(self, name, id):
        self.name = name
        self.id = id
        self.score = 0
        self.pos = 0
        self.pad = PADWIDTH
        self.move = 0

    def move_paddle(self, speed):
        if (self.move < 0 and self.pos <= HEIGHT/-2):
            self.move = 0
        elif (self.move > 0 and self.pos >= HEIGHT/2):
            self.move = 0
        else:
            self.pos += self.move * speed * DELTATIME

    def score_up(self):
        self.score = self.score + 1
        if self.score == MAX_SCORE:
            return 1

class Game:

    def __init__(self, game_id, id1, username1, id2, username2, wsh):
        self.wsh = wsh
        self.players = []
        self.over = False
        self.id = game_id
        self.speed = 1
        self.players.append(Player(username1, id1))
        self.players.append(Player(username2, id2))
        print(f"{GREEN}New game {game_id} launched opposing **{self.players[LEFT].name}({self.players[LEFT].id})** vs {self.players[RIGHT].name}({self.players[RIGHT].id}){RESET}")
        self.ball_pos = [WIDTH / 2, HEIGHT / 2]
        self.ball_spd = [self.random_neg_or_not_number(2, 5),
                         self.random_neg_or_not_number(2, 5)]

    async def reset_values(self):
        time = 2
        await self.wsh.channel_layer.group_send(
            self.wsh.room_group_name, {"type": "wait.a.bit", "time": time}
        )
        self.ball_pos = [WIDTH / 2, HEIGHT / 2]
        self.ball_spd = [self.random_neg_or_not_number(3, 4),
                         self.random_neg_or_not_number(3, 4)]
        for player in self.players:
            player.pad = PADWIDTH
            player.pos = (HEIGHT - PADWIDTH) / 2
        self.speed = 1
        await asleep(time)

    '''Must have a < b'''
    def random_neg_or_not_number(self, a, b) -> int:
        if choice([True, False]):
            return randint(-b, -a)
        else:
            return randint(a, b)

    async def move_ball(self):
        # move
        self.ball_pos[0] += DELTATIME * self.ball_spd[0] * self.speed
        self.ball_pos[1] += DELTATIME * self.ball_spd[1] * self.speed
        # top / bottom collision
        if (self.ball_pos[1] <= 0 or self.ball_pos[1] >= HEIGHT):
            self.ball_spd[1] *= -1
        # left / right collision
        if (self.ball_pos[0] <= WIDTH/-2):
            await self.side_collision(LEFT)
        if (self.ball_pos[0] >= WIDTH/2):
            await self.side_collision(RIGHT)

    async def side_collision(self, side):
        # check paddle collision
        if self.players[side].pos < self.ball_pos[1] < self.players[side].pos + self.players[side].pad :
            self.ball_spd[0] *= -1
            self.speed += 0.2
            if self.players[side].pad > PADMINIMUM:
                self.players[side].pad = max(self.players[side].pad - PADSHRINK, PADMINIMUM)
            return
        # if ball go through, score and check endmatch
        if self.players[1 - side].score_up():
            self.over = True
            return
        # if the match continues, reset the values and move on to the next point.
        await self.reset_values()
        # await wsh.channel_layer.group_send(
        #     wsh.room_group_name, {"type": "handle.message", "message": self.get_game_state()}
        # )

    def set_player_move(self, id, move):
        self.players[id].move = int(move)
        # prevent hax allowing the player to move way too fast
        if (self.players[id].move < 1.0):
            self.players[id].move = -1
        elif (self.players[id].move > 1.0):
            self.players[id].move = 1

    def move_players(self):
        for player in self.players:
            player.move_paddle(self.speed)

    def get_game_state(self):
        return {
            "action":"info",
            "ball": self.ball_pos,
            "ball_dir": self.ball_spd,
            "lpos": self.players[LEFT].pos,
            "rpos": self.players[RIGHT].pos,
            "size": [self.players[LEFT].pad, self.players[RIGHT].pad],
            "lscore": self.players[LEFT].score,
            "rscore": self.players[RIGHT].score,
        }

    async def play(self):
        target_fps = FPS
        frame_duration = 1 / target_fps

        last_frame_time = time()
        while not self.over:
            current_time = time()
            elapsed_time = current_time - last_frame_time
            if elapsed_time < frame_duration:
                await asleep(frame_duration - elapsed_time)
            await self.wsh.channel_layer.group_send(
                self.wsh.room_group_name, {"type": "handle.message", "message": self.get_game_state()}
            )
            self.move_players()
            await self.move_ball()
            last_frame_time = time()
        await self.wsh.channel_layer.group_send(
            self.wsh.room_group_name, {"type": "disconnect.now", "from": "server"}
        )

    def get_score(self):
        data = {
            'score':{
                int(self.players[LEFT].id): int(self.players[LEFT].score),
                int(self.players[RIGHT].id): int(self.players[RIGHT].score),
                'game_id': int(self.id)
            }
        }
        return data