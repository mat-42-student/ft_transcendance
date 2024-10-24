field = document.getElementById("pong_field");
lpad = document.getElementById("player1");
rpad = document.getElementById("player2");
ball_div = document.getElementById("ball");

playing, raf;
side = 0, ball_dx, ball_dy, ball_x = field.offsetWidth / 2, ball_y = field.offsetHeight / 2;
winner, speed;

/////////////////////////// On load ///////////////////////////
field.setAttribute('tabindex', '0'); // Make playground focusable
field.focus();
localGame();
/////////////////////////// Events part ///////////////////////////

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
        move[side] = -1;
    else if (key === 'z' || key === '3')
        move[side] = 1;
}

function keyup(event) {
    key = event.key;
    side = getSide(key)
    if (side === null || event.key !== keyStillDown[side])
        return
    keyStillDown[side] = false
    move[side] = 0;
}

/////////////////////////// Game engine ///////////////////////////

function localGame() {
    init();
    // document.getElementById("lplayer").innerText = nick[LEFT_PLAYER];
    // document.getElementById("rplayer").innerText = nick[RIGHT_PLAYER];
    // document.getElementById("lscore").innerText = 0;
    // document.getElementById("rscore").innerText = 0;
    
    raf = requestAnimationFrame(play);
}

function init() {
    resetValues();
    playing = true;
    move[LEFT_PLAYER] = move[RIGHT_PLAYER] = score[LEFT_PLAYER] = score[RIGHT_PLAYER] = 0;
    keyStillDown[LEFT_PLAYER] = keyStillDown[RIGHT_PLAYER] = false;    
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

function movePaddles() {
    // console.log("leftpad:" + pad[LEFT_PLAYER]);
    if (move[LEFT_PLAYER]) {
        pad[LEFT_PLAYER] += move[LEFT_PLAYER] * 2 * speed;
        if (pad[LEFT_PLAYER] < 0)
            pad[LEFT_PLAYER] = 0;
        if (pad[LEFT_PLAYER] + size[LEFT_PLAYER] > field.offsetHeight)
            pad[LEFT_PLAYER] = field.offsetHeight - size[LEFT_PLAYER];
    }
    if (move[RIGHT_PLAYER]) {
        pad[RIGHT_PLAYER] += move[RIGHT_PLAYER] * 2 * speed;
        if (pad[RIGHT_PLAYER] < 0)
            pad[RIGHT_PLAYER] = 0;
        if (pad[RIGHT_PLAYER] + size[RIGHT_PLAYER] > field.offsetHeight)
            pad[RIGHT_PLAYER] = field.offsetHeight - size[RIGHT_PLAYER];
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
    if (ball_x <= 0)
        side_collision(LEFT_PLAYER);
    else if (ball_x + RADIUS >= field.offsetWidth)
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
    winner = score[LEFT_PLAYER] >= SCORE_MAX ? "Player 1" : "Player 2";
    alert(`GAME OVER\nLe gagnant est ${winner}!`);
    cancelAnimationFrame(raf);
    init();
    playing = false;
    changeMainHTML("./matchmaking.html", null);
}

function play() {
    movePaddles();
    moveBall();
    if (playing)
        requestAnimationFrame(play);
}