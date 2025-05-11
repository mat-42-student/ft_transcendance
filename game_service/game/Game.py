from random import choice
from time import time
from asyncio import sleep as asleep
from .const import LEFT, RIGHT, FPS, DELTATIME, GREEN, RED, RESET, STATS, LEVELS
from .bounce import bounce


class Player:

    def __init__(self, name, id):
        self.name = name
        self.id = id
        self.score = 0
        self.pos = 0
        self.pad_size = STATS['initialPadSize']
        self.move = 0

    def move_paddle(self, speed, board_half_height):
        is_too_low = self.pos <= -board_half_height
        is_too_high = self.pos >= board_half_height
        if ((self.move < 0 and not is_too_low)
            or (self.move > 0 and not is_too_high)):
            self.pos += self.move * speed * DELTATIME

    def score_up(self, game):
        self.score += 1
        if self.score >= STATS['maxScore']:
            game.over = True

class Game:

    def __init__(self, game_id, id1, username1, id2, username2, wsh, level_name):
        self.wsh = wsh
        self.level = LEVELS[level_name]
        self.players = [Player(username1, id1), Player(username2, id2)]
        self.over = False
        self.id = game_id
        self.ball_speed = STATS['initialBallSpeed']
        self.pad_speed = STATS['initialPadSpeed']
        self.round_start_mult = choice([1, -1])
        self.loaded = False
        self.was_not_loaded = True
        self.recenter()
        print(f"{GREEN}New game {game_id}: **{self.players[LEFT].name}({self.players[LEFT].id})** vs {self.players[RIGHT].name}({self.players[RIGHT].id}), on level '{level_name}'.{RESET}")

    def recenter(self):
        self.ball_pos = [0, 0]
        self.ball_direction = [0.7071067811865475 * self.round_start_mult, 0.7071067811865475]
        self.players[0].pos = self.players[1].pos = 0

    async def new_round(self):
        # Send "info" manually, so the client can display the new score without waiting the pause.
        await self.wsh.channel_layer.group_send(
            self.wsh.room_group_name, {"type": "handle.message", "message": self.get_game_state()}
        )
        self.recenter()
        self.ball_speed *= STATS['ballAccelerateFactor']
        self.pad_speed *= STATS['padAccelerateFactor']
        self.players[0].pad_size *= STATS['padShrinkFactor']
        self.players[1].pad_size = self.players[0].pad_size
        await self.eepytime(1)


    async def move_ball(self):
        # move
        self.ball_pos[0] += DELTATIME * self.ball_direction[0] * self.ball_speed
        self.ball_pos[1] += DELTATIME * self.ball_direction[1] * self.ball_speed
        HALF_BOARD = [ self.level["board_size"][0] / 2, self.level["board_size"][1] / 2 ]
        # top / bottom collision
        if (self.ball_pos[1] <= -HALF_BOARD[1] or self.ball_pos[1] >= HALF_BOARD[1]):
            self.ball_direction[1] *= -1
        # left / right collision
        if (self.ball_pos[0] < -HALF_BOARD[0]):
            await self.side_collided(RIGHT)
        elif (self.ball_pos[0] > HALF_BOARD[0]):
            await self.side_collided(LEFT)

    async def side_collided(self, side):
        is_ball_below_paddle = self.ball_pos[1] < self.players[side].pos - self.players[side].pad_size/2
        is_ball_above_paddle = self.ball_pos[1] > self.players[side].pos + self.players[side].pad_size/2

        # did the ball miss the paddle? -> Score
        if is_ball_below_paddle or is_ball_above_paddle:
            self.round_start_mult = -1 if side == 1 else 1
            self.players[1 - side].score_up(self)
            await self.new_round()

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
            player.move_paddle(self.pad_speed, self.level["board_size"][1] / 2)

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

    async def eepytime(self, time = 1):
        await self.wsh.channel_layer.group_send(
            self.wsh.room_group_name, {"type": "wait.a.bit", "time": time}
        )
        await asleep(time)


    async def play(self):
        last_frame_time = time()
        while not self.over:
            current_time = time()
            elapsed_time = current_time - last_frame_time
            if elapsed_time < DELTATIME:
                await asleep(DELTATIME - elapsed_time)
            if self.loaded:
                if self.was_not_loaded:
                    self.was_not_loaded = False
                    await self.eepytime(3)
                await self.wsh.channel_layer.group_send(
                    self.wsh.room_group_name, {"type": "handle.message", "message": self.get_game_state()}
                )
                self.move_players()
                await self.move_ball()
            last_frame_time = time()
        await self.endgame_by_victory()

    async def endgame_by_victory(self):
        await self.wsh.channel_layer.group_send(
            self.wsh.room_group_name, {
                "type": "declare.winner",
                "winner": 0 if self.players[0].score > self.players[1].score else 1,
                "scores":  [self.players[0].score, self.players[1].score]
        })
        await self.wsh.send_score()
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