/////////////////////////// On load ///////////////////////////

const engine = document.getElementById('bg-engine');

side = 0;
ball_x = 0;
ball_y = 0;

document.body.setAttribute('tabindex', '0'); // Make playground focusable
document.body.focus();

localGameCPU();

/////////////////////////// Events part ///////////////////////////

engine.addEventListener('click', () => {
  engine.focus();
});

document.body.addEventListener('keydown', keydown)
document.body.addEventListener('keyup', keyup)

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

/////////////////////////// Utils ///////////////////////////

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

/////////////////////////// Game engine ///////////////////////////

function localGameCPU() {
    init();
    difficulty = 3.2;
    // difficulty = document.getElementById("diff").value;
    raf = requestAnimationFrame(play);
}

function init() {
    //TODO this will eventually pick from a list of backgrounds.
    //     This placeholder is here to test that the data moves around correctly.
    level = 'random level ' + Math.floor(randomInRange(0,10));

    engine.state = new window.imports.StateInGame(level);

    engine.state.adversaryUser = generateRandomNick();

    startRound();
    playing = true;
    move[LEFT_PLAYER] = move[RIGHT_PLAYER] = score[LEFT_PLAYER] = score[RIGHT_PLAYER] = 0;
    keyStillCPUDown = false;
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
    engine.state.playerScore = 0;
    engine.state.playerPaddleSize = size[LEFT_PLAYER];
    engine.state.playerPaddlePosition = pad[LEFT_PLAYER];
    
    engine.state.adversaryScore = 0;
    engine.state.adversaryPaddleSize = size[RIGHT_PLAYER];
    engine.state.adversaryPaddlePosition = pad[RIGHT_PLAYER];

    engine.state.arenaSize = field_size;
    engine.state.ballPosition = {x: ball_x, y: ball_y};
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
    engine.state.playerScore = score[LEFT_PLAYER];
    engine.state.adversaryScore = score[RIGHT_PLAYER];
    if (score[side] >= SCORE_MAX) {
        endgame();
        return;
    }
    startRound();
}

function endgame() {
    winner = score[LEFT_PLAYER] >= SCORE_MAX ? "Player 1" : "CPU";
    alert(`GAME OVER\nLe gagnant est ${winner}!`);
    cancelAnimationFrame(raf);
    // init(); //REVIEW ??????????????
    engine.state = new window.imports.StateIdle(engine.state);
    playing = false;
    window.location.hash = 'matchmaking.html';
}

function play(time) {
    movePaddles();
    moveBall();
    copyValuesToEngine();
    engine.frame(time);
    if (playing)
        requestAnimationFrame(play);
}