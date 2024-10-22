const PADWIDTH = 100;
const RADIUS = 20;
const LEFT_PLAYER = 0;
const RIGHT_PLAYER = 1;
const SCORE_MAX = 5;

let field = document.getElementById("pong_field");
let lpad = document.getElementById("player1");
let rpad = document.getElementById("player2");
let ball_div = document.getElementById("ball");

let playing, raf, difficulty;
let side = 0, ball_dx, ball_dy, ball_x = field.offsetWidth / 2, ball_y = field.offsetHeight / 2;
let winner, speed, keyStillDown;
let pad = [], move = [], score = [], nick = [], size = [];
nick[LEFT_PLAYER] = generateRandomNick();
nick[RIGHT_PLAYER] = "CPU";

/////////////////////////// On load ///////////////////////////
document.getElementById("lplayer_name").value = nick[LEFT_PLAYER];

/////////////////////////// Events part ///////////////////////////

field.setAttribute('tabindex', '0'); // Make playground focusable
field.focus();
field.addEventListener('click', () => {
  field.focus();
});

field.addEventListener('keydown', keydown)
field.addEventListener('keyup', keyup)

function keydown(event) {
    key = event.key;
    if (keyStillDown)
        return;
    keyStillDown = key;
    if (key === 'q')
        move[0] = -1;
    else if (key === 'z')
        move[0] = 1;
}

function keyup(event) {
    if (event.key !== keyStillDown)
        return
    keyStillDown = false
    move[0] = 0;
}

/////////////////////////// Utils ///////////////////////////

function generateRandomNick() {
    const adjectives = ["Shadow", "Steady", "Mighty", "Funny", "Hidden", "Normal"];
    const nouns = ["Ficus", "Pidgin", "Rock", "Pillow", "Curtains", "Hobo"];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return randomAdj + randomNoun + Math.floor(Math.random() * 1000);
}

function randomInRange(a, b) {
    let range = Math.random() < 0.5 ? [-b, -a] : [a, b];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

/////////////////////////// Game engine ///////////////////////////

function localGame() {
    document.getElementById("settings").hidden = true;
    document.getElementById("game_div").hidden = false;
    init();
    document.getElementById("lplayer_name").value = nick[LEFT_PLAYER];
    document.getElementById("lplayer").innerText = nick[LEFT_PLAYER];
    document.getElementById("rplayer").innerText = nick[RIGHT_PLAYER];
    document.getElementById("lscore").innerText = 0;
    document.getElementById("rscore").innerText = 0;
    difficulty = document.getElementById("diff").value;
    console.log(difficulty);
    raf = requestAnimationFrame(play);
}

function init() {
    resetValues();
    playing = true;
    move[LEFT_PLAYER] = move[RIGHT_PLAYER] = score[LEFT_PLAYER] = score[RIGHT_PLAYER] = 0;
    size[LEFT_PLAYER] = size[RIGHT_PLAYER] = PADWIDTH;
    keyStillDown = false;    
}

function resetValues() {
    ball_x = field.offsetWidth / 2;
    ball_y = field.offsetHeight / 2;
    ball_dx = randomInRange(3, 4);
    ball_dy = randomInRange(3, 4);
    speed = 1;
    size[LEFT_PLAYER] = size[RIGHT_PLAYER] = PADWIDTH;
    pad[LEFT_PLAYER] = pad[RIGHT_PLAYER] = (field.offsetHeight - PADWIDTH) / 2 ;
    document.getElementById("player1").style.height = size[LEFT_PLAYER] + 'px';
    document.getElementById("player2").style.height = size[RIGHT_PLAYER] + 'px';
}

function cpuMove() {
    move[RIGHT_PLAYER] = ball_y > (pad[RIGHT_PLAYER] + size[RIGHT_PLAYER] /2) ? 1 : -1;
}

function movePaddles() {
    cpuMove();
    if (move[LEFT_PLAYER]) {
        pad[LEFT_PLAYER] += move[LEFT_PLAYER] * 2 * speed;
        if (pad[LEFT_PLAYER] < 0)
            pad[LEFT_PLAYER] = 0;
        if (pad[LEFT_PLAYER] + size[LEFT_PLAYER] > field.offsetHeight)
            pad[LEFT_PLAYER] = field.offsetHeight - size[LEFT_PLAYER];
    }
    if (move[RIGHT_PLAYER]) {
        if (difficulty == 10)
            pad[RIGHT_PLAYER] = ball_y - size[RIGHT_PLAYER] / 2;
        else
            pad[RIGHT_PLAYER] += move[RIGHT_PLAYER] * difficulty * speed;
        if (pad[RIGHT_PLAYER] < 0)
            pad[RIGHT_PLAYER] = 0;
        if (pad[RIGHT_PLAYER] + size[RIGHT_PLAYER] > field.offsetHeight)
            pad[RIGHT_PLAYER] = field.offsetHeight - size[RIGHT_PLAYER];
    }
    lpad.style.top = pad[LEFT_PLAYER] + 'px';
    rpad.style.top = pad[RIGHT_PLAYER] + 'px';
}

function moveBall() {
    // Move ball
    ball_x = ball_x + ball_dx * speed;
    ball_y = ball_y +  ball_dy * speed;
    // Check top / bottom collision
    if (ball_y <= 0 || ball_y + RADIUS >= field.offsetHeight)
        ball_dy = -ball_dy;
    // Check left / right collision
    if (ball_x <= 20)
        side_collision(LEFT_PLAYER);
    else if (ball_x + RADIUS >= field.offsetWidth - 20)
        side_collision(RIGHT_PLAYER);
    ball_div.style.left = ball_x + 'px'
    ball_div.style.top = ball_y + 'px'
}

function side_collision(side) {
    // check paddle collision
    if (pad[side] <= ball_y && ball_y <= pad[side] + size[side]) {
        if (size[side] > 10)
            size[side] -= 10;
        document.getElementById("player1").style.height = size[LEFT_PLAYER] + 'px';
        document.getElementById("player2").style.height = size[RIGHT_PLAYER] + 'px';
        ball_dx = -ball_dx;
        speed += 0.3;
        return;
    }
    scoreup(1 - side);
}

function scoreup(side) {
    score[side]++;
    document.getElementById("lscore").innerText = score[LEFT_PLAYER];
    document.getElementById("rscore").innerText = score[RIGHT_PLAYER];
    if (score[side] >= SCORE_MAX) {
        endgame();
        return;
    }
    resetValues();
}

function endgame() {
    winner = score[LEFT_PLAYER] >= SCORE_MAX ? LEFT_PLAYER : RIGHT_PLAYER;
    alert(`GAME OVER\nLe gagnant est ${nick[winner]}!`);
    cancelAnimationFrame(raf);
    document.getElementById("lscore").innerText = document.getElementById("rscore").innerText = 0;
    document.getElementById("game_div").hidden = true;
    document.getElementById("settings").hidden = false;
    init();
    playing = false;
}

function play() {
    movePaddles();
    moveBall();
    if (playing)
        requestAnimationFrame(play);
}