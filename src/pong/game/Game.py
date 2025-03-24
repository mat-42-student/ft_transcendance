from random import randint, choice
from time import time
from json import dumps
from asyncio import sleep as asleep
from .const import LEFT, RIGHT, FPS, DELTATIME, GREEN, RED, RESET, STATS
from .bounce import bounce


# TODO: this will be read from a dictionary of levels, matching on level name
BOARD_SIZE = [1.5, 1.0]


class Player:

    def __init__(self, name, id):
        self.name = name
        self.id = id
        self.score = 0
        self.pos = 0
        self.pad_size = STATS['initialPadSize']
        self.move = 0

    def move_paddle(self, speed):
        HALF_HEIGHT = BOARD_SIZE[1] / 2
        is_too_low = self.pos <= -HALF_HEIGHT
        is_too_high = self.pos >= HALF_HEIGHT
        if ((self.move < 0 and not is_too_low)
            or (self.move > 0 and not is_too_high)):
            self.pos += self.move * speed * DELTATIME

    def score_up(self):
        self.score += 1
        return self.score == STATS['maxScore']

class Game:

    def __init__(self, game_id, id1, username1, id2, username2, wsh):
        self.wsh = wsh
        self.players = [Player(username1, id1), Player(username2, id2)]
        self.over = False
        self.id = game_id
        self.ball_speed = STATS['initialBallSpeed']
        self.pad_speed = STATS['initialPadSpeed']
        self.recenter()
        print(f"{GREEN}New game {game_id} launched opposing **{self.players[LEFT].name}({self.players[LEFT].id})** vs {self.players[RIGHT].name}({self.players[RIGHT].id}){RESET}")

    def recenter(self):
        self.ball_pos = [0, 0]
        self.ball_direction = [0.7071067811865475 * choice([1, -1]), 0.7071067811865475]
        self.players[0].pos = self.players[1].pos = 0

    async def new_round(self):
        time = 2
        await self.wsh.channel_layer.group_send(
            self.wsh.room_group_name, {"type": "wait.a.bit", "time": time}
        )
        self.recenter()
        self.ball_speed *= STATS['ballAccelerateFactor']
        self.pad_speed *= STATS['padAccelerateFactor']
        self.players[0].pad_size *= STATS['padShrinkFactor']
        self.players[1].pad_size = self.players[0].pad_size
        await asleep(time)


    async def move_ball(self):
        # move
        self.ball_pos[0] += DELTATIME * self.ball_direction[0] * self.ball_speed
        self.ball_pos[1] += DELTATIME * self.ball_direction[1] * self.ball_speed
        # top / bottom collision
        if (self.ball_pos[1] <= BOARD_SIZE[1]/-2 or self.ball_pos[1] >= BOARD_SIZE[1]/2):
            self.ball_direction[1] *= -1
        # left / right collision
        if (self.ball_pos[0] < BOARD_SIZE[0]/-2):
            await self.side_collided(RIGHT)
        elif (self.ball_pos[0] > BOARD_SIZE[0]/2):
            await self.side_collided(LEFT)

    async def side_collided(self, side):
        is_ball_below_paddle = self.ball_pos[1] < self.players[side].pos - self.players[side].pad_size/2
        is_ball_above_paddle = self.ball_pos[1] > self.players[side].pos + self.players[side].pad_size/2

        # did the ball miss the paddle? -> Score
        if is_ball_below_paddle or is_ball_above_paddle:
            if self.players[1 - side].score_up():
                self.over = True
            await self.new_round()
            # await wsh.channel_layer.group_send(
            #     wsh.room_group_name, {"type": "handle.message", "message": self.get_game_state()}
            # )

        # the ball hit the paddle -> Bounce
        else:
            # Undo movement, so that there is no way the ball is still outside the board
            # on next frame's check... maybe with an extremely shallow trajectory.
            self.ball_pos[1] -= DELTATIME * self.ball_direction[1] * self.ball_speed
            self.ball_direction = bounce(
                self.ball_direction, self.ball_pos,
                self.players[side].pos, self.players[side].pad_size,
                side
            )

    def set_player_move(self, id, move):
        self.players[id].move = int(move)

    def move_players(self):
        for player in self.players:
            player.move_paddle(self.pad_speed)

    def get_game_state(self):
        return {
            "action":"info",
            "ball": self.ball_pos,
            "ball_dir": self.ball_direction,
            "lpos": self.players[LEFT].pos,
            "rpos": self.players[RIGHT].pos,
            "size": [self.players[LEFT].pad_size, self.players[RIGHT].pad_size],
            "lscore": self.players[LEFT].score,
            "rscore": self.players[RIGHT].score,
        }

    async def play(self):
        last_frame_time = time()
        while not self.over:
            current_time = time()
            elapsed_time = current_time - last_frame_time
            if elapsed_time < DELTATIME:
                await asleep(DELTATIME - elapsed_time)
            await self.wsh.channel_layer.group_send(
                self.wsh.room_group_name, {"type": "handle.message", "message": self.get_game_state()}
            )
            self.move_players()
            await self.move_ball()
            last_frame_time = time()
        await self.wsh.channel_layer.group_send(
            self.wsh.room_group_name, {"type": "disconnect.now", "side": "server"}
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