// MARK: Events

import engine from "engine";

function keydown(event) {
    key = event.key;
    console.log('input', event);
    if (keyStillCPUDown)
        return;
    keyStillCPUDown = key;
    if (key === 'q')
        move[0] = 1;
    else if (key === 'z')
        move[0] = -1;
}

function keyup(event) {
    if (event.key !== keyStillCPUDown)
        return
    keyStillCPUDown = false
    move[0] = 0;
}

// MARK: Utils

function generateRandomNick() {
    const adjectives = ["Shadow", "Steady", "Mighty", "Funny", "Hidden", "Normal"];
    const nouns = ["Ficus", "Pidgin", "Rock", "Pillow", "Curtains", "Hobo"];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return '[BOT] ' + randomAdj + randomNoun + Math.floor(Math.random() * 1000);
}

function randomInRange(a, b) {
    let range = Math.random() < 0.5 ? [-b, -a] : [a, b];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

// MARK: Game engine

export function startLocalGameCPU() {
    if (playing == true) throw Error("Already playing??");
    playing = true;
    engine.loading = true;

    side = 0;
    ball_x = 0;
    ball_y = 0;

    document.body.setAttribute('tabindex', '0'); // Make playground focusable
    document.body.focus();

    document.body.addEventListener('click', () => {
      document.body.focus();
    });

    document.body.addEventListener('keydown', keydown)
    document.body.addEventListener('keyup', keyup)

    difficulty = 3.2;

    //TODO this will eventually pick from a list of backgrounds.
    //     This placeholder is here to test that the data moves around correctly.
    level = 'random level ' + Math.floor(randomInRange(0,10));

    //TODO engine. ... actually load the level

    engine.gameState.playerNames[0] = '//TODO read player name here';
    engine.gameState.playerNames[1] = generateRandomNick();

    move[LEFT_PLAYER] = move[RIGHT_PLAYER] = score[LEFT_PLAYER] = score[RIGHT_PLAYER] = 0;
    keyStillCPUDown = false;

    engine.loading = false;
    startRound();
    cancelCurrentGameFunction = () => { endgame(true); };
    gameFrame = simulationFrame;
}


function startRound() {
    field_size = {x: 4, y: 3};

    ball_x = 0;
    ball_y = 0;
    ball_dx = 1;
    ball_dy = 1;
    speed = 0.005;
    size[LEFT_PLAYER] = size[RIGHT_PLAYER] = PADWIDTH;
    pad[LEFT_PLAYER] = pad[RIGHT_PLAYER] = 0;
}

function copyValuesToEngine() {
    engine.gameState.isPlaying = playing;

    engine.gameState.scores = score;

    engine.gameState.paddleHeights = size;

    engine.gameState.paddlePositions = pad;

    engine.gameState.boardSize.width = field_size.x;
    engine.gameState.boardSize.height = field_size.y;

    engine.gameState.ballPosition.x = ball_x;
    engine.gameState.ballPosition.y = ball_y;
}

function cpuMove() {
    move[RIGHT_PLAYER] = ball_y > (pad[RIGHT_PLAYER]) ? 1 : -1;
}

function movePaddles() {
    cpuMove();
    if (move[LEFT_PLAYER]) {
        const limit = field_size.y - size[LEFT_PLAYER] / 2;
        pad[LEFT_PLAYER] += move[LEFT_PLAYER] * 2 * speed;
        pad[LEFT_PLAYER] = clamp(pad[LEFT_PLAYER], -limit, limit);
    }
    if (move[RIGHT_PLAYER]) {
        const limit = field_size.y - size[RIGHT_PLAYER] / 2;
        if (difficulty == 10)
            pad[RIGHT_PLAYER] = ball_y - size[RIGHT_PLAYER] / 2;
        else {
            pad[RIGHT_PLAYER] += move[RIGHT_PLAYER] * difficulty * speed;
            pad[RIGHT_PLAYER] = clamp(pad[RIGHT_PLAYER], -limit, limit);
        }
    }
}

function moveBall() {
    // Move ball
    ball_x = ball_x + ball_dx * speed;
    ball_y = ball_y +  ball_dy * speed;

    // Check top / bottom collision
    if (ball_y <= -(field_size.y/2) || ball_y >= field_size.y/2)
        ball_dy = -ball_dy;
    // Check left / right collision
    if (ball_x <= -(field_size.x/2))
        side_collision(LEFT_PLAYER);
    else if (ball_x >= field_size.x/2)
        side_collision(RIGHT_PLAYER);
}

function side_collision(side) {
    // check paddle collision
    if ((pad[side] - size[side]/2 <= ball_y)
        && (pad[side] + size[side]/2 >= ball_y)) {
        if (size[side] > 0.1)
            size[side] -= 0.1;
        ball_dx = -ball_dx;
        speed += 0.01;
        return;
    }
    scoreup(1 - side);
}

function scoreup(side) {
    score[side]++;

    //TODO signal score change to engine gamestate

    if (score[side] >= SCORE_MAX) {
        endgame(false);
        return;
    }
    startRound();
}

/** @param {boolean} cancelled  */
function endgame(cancelled) {
    if (cancelled !== true) {
        winner = score[LEFT_PLAYER] >= SCORE_MAX ? "Player 1" : "CPU";
        alert(`GAME OVER\nLe gagnant est ${winner}!`);
    }
    // init(); //REVIEW ?
    playing = false;
    copyValuesToEngine();
    window.location.hash = 'matchmaking.html';
    gameFrame = undefined;
    cancelCurrentGameFunction = undefined;
}

function simulationFrame(time) {
    movePaddles();
    moveBall();
    copyValuesToEngine();
}