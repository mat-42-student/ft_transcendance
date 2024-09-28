const PADWIDTH = 100;
const RADIUS = 10;
const LEFT_PLAYER = 0;
const RIGHT_PLAYER = 1;
const SCORE_MAX = 5;

let field = document.getElementById("pong_field");
let lpad = document.getElementById("player1");
let rpad = document.getElementById("player2");
let ball_div = document.getElementById("ball");

let playing, raf;
let side = 0, ball_dx, ball_dy, ball_x = field.offsetWidth / 2, ball_y = field.offsetHeight / 2;
let winner, speed;
let pad = [], move = [], score = [], keyStillDown = [], nick = [];
nick[LEFT_PLAYER] = generateRandomNick();
nick[RIGHT_PLAYER] = generateRandomNick();

///////////////////////////  Events part ///////////////////////////

field.setAttribute('tabindex', '0'); // Make playground focusable
field.focus();
field.addEventListener('click', () => {
  field.focus();
});

field.addEventListener('keydown', keydown)
field.addEventListener('keyup', keyup)

function getSide(key) {
    if (key === 'q' || key === 'z')
        return 0;
    else if (key === '9' || key === '3')
        return 1;
    return null;
}

function keydown(event) {
    key = event.key;
    side = getSide(key);
    // console.log('side' + side);
    if (side === null || keyStillDown[side])
        return;
    keyStillDown[side] = key;
    if (key === 'q' || key === '9')
        move[side] = -1 * speed;
    else if (key === 'z' || key === '3')
        move[side] = 1 * speed;
    console.log("move:" + move[side]);
}

function keyup(event) {
    key = event.key;
    side = getSide(key)
    if (side === null || event.key !== keyStillDown[side])
        return
    keyStillDown[side] = false
    move[side] = 0;
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
    init();
    playing = true;
    document.getElementById("settings").hidden = true;
    document.getElementById("game_div").hidden = false;
    document.getElementById("lplayer").innerText = nick[LEFT_PLAYER];
    document.getElementById("rplayer").innerText = nick[RIGHT_PLAYER];
    document.getElementById("lscore").innerText = score[LEFT_PLAYER];
    document.getElementById("rscore").innerText = score[RIGHT_PLAYER];
    if (playing)
        raf = requestAnimationFrame(play);
}

function init() {
    resetBall();
    pad[LEFT_PLAYER] = pad[RIGHT_PLAYER] = field.offsetHeight / 2 ;
    move[LEFT_PLAYER] = move[RIGHT_PLAYER] = score[LEFT_PLAYER] = score[RIGHT_PLAYER] = 0;
    keyStillDown[LEFT_PLAYER] = keyStillDown[RIGHT_PLAYER] = false;    
    playing = false;
}

function resetBall() {
    ball_x = field.offsetWidth / 2;
    ball_y = field.offsetHeight / 2;
    alert(ball_x + " " + ball_y);
    ball_dx = randomInRange(3, 4);
    ball_dy = randomInRange(3, 4);
    speed = 1;
}

function movePaddles() {
    // console.log("leftpad:" + pad[LEFT_PLAYER]);
    if (move[LEFT_PLAYER]) {
        pad[LEFT_PLAYER] += move[LEFT_PLAYER] * 2;
        if (pad[LEFT_PLAYER] < 0)
            pad[LEFT_PLAYER] = 0;
        if (pad[LEFT_PLAYER] + PADWIDTH > field.offsetHeight)
            pad[LEFT_PLAYER] = field.offsetHeight - PADWIDTH;
    }
    if (move[RIGHT_PLAYER]) {
        pad[RIGHT_PLAYER] += move[RIGHT_PLAYER] * 2;
        if (pad[RIGHT_PLAYER] < 0)
            pad[RIGHT_PLAYER] = 0;
        if (pad[RIGHT_PLAYER] + PADWIDTH > field.offsetHeight)
            pad[RIGHT_PLAYER] = field.offsetHeight - PADWIDTH;
    }
    lpad.style.top = pad[LEFT_PLAYER] + 'px';
    rpad.style.top = pad[RIGHT_PLAYER] + 'px';
}

function moveBall() {
    // Move
    ball_x = ball_x + ball_dx * speed;
    ball_y = ball_y +  ball_dy * speed;
    // Check top / bottom collision
    if (ball_y <= 0 || ball_y + RADIUS >= field.offsetHeight)
        ball_dy = -ball_dy;
    // Check left / right collision
    if (ball_x <= 20)
        side_collision(LEFT_PLAYER);
    if (ball_x + RADIUS >= field.offsetWidth - 20)
        side_collision(RIGHT_PLAYER);
    ball_div.style.left = ball_x + 'px'
    ball_div.style.top = ball_y + 'px'
}

function side_collision(side) {
    // check paddle collision
    alert("ball_x: " + ball_x);
    if (pad[side] <= ball_y && ball_y <= pad[side] + PADWIDTH) {
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
    resetBall();
}

function endgame() {
    document.getElementById("lscore").innerText = document.getElementById("rscore").innerText = 0;
    winner = score[LEFT_PLAYER] >= 10 ? LEFT_PLAYER : RIGHT_PLAYER;
    alert(`GAME OVER\nLe gagnant est ${nick[winner]}!`);
    document.getElementById("game_div").hidden = true;
    document.getElementById("settings").hidden = false;
    init();
}

function play() {
    if (!playing)
        // return;
        cancelAnimationFrame(raf);
    movePaddles();
    moveBall();
    requestAnimationFrame(play);
}

document.getElementById("lplayer_name").value = nick[LEFT_PLAYER];
document.getElementById("rplayer_name").value = nick[RIGHT_PLAYER];