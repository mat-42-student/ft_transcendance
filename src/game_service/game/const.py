from json import loads

RESET = "\033[0m"
BLUE = "\033[1;34m"
GREEN = "\033[1;32m"
RED = "\033[1;31m"
YELLOW = "\033[1;33m"
CYAN = "\033[1;36m"
MAGENTA = "\033[1;35m"
LEFT = 0
RIGHT = 1


FPS = 60
DELTATIME = 1.0 / FPS

# Controls how the game runs.
# Should be (manually) kept in sync with LocalGame.js
STATS = {
    "initialPadSize": 0.2,
    "initialPadSpeed": 0.2,
    "padShrinkFactor": 0.95,
    "padAccelerateFactor": 1.1,

    "initialBallSpeed": 0.4,
    "ballAccelerateFactor": 1.1,
    "redirectionFactor": 1.5,
    "maxAngleDeg": 45.0,

    "maxScore": 5
}

LEVELS = {
    # "debug": {
    #     "board_size": [1.5, 1.0],
    # },
    "retro-pong": {
        "board_size": [4/3, 1.0],
    },
}
