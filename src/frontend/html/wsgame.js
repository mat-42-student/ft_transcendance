const PADWIDTH = 100;
const RADIUS = 10;
const LEFT_PLAYER = 0;
const RIGHT_PLAYER = 1;
let field = document.getElementById("pong_field");
let game_id, player_name;
let side = 0;
let playing = false;
let KeyStillDown = false;
let key;
let socket;
let pad = [], move = [], ball = [];
move[LEFT_PLAYER] = move[RIGHT_PLAYER] = 0;
let ball_dx = 0;
let ball_dy = 0;
let lpad = document.getElementById("player1");
let rpad = document.getElementById("player2");
let ball_div = document.getElementById("ball");


/////////////////////////// Socket part ///////////////////////////

function generateRandomNick() {
    const adjectives = ["Shadow", "Steady", "Mighty", "Funny", "Hidden", "Normal"];
    const nouns = ["Ficus", "Pidgin", "Rock", "Spring", "Curtains", "Hobo"];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return randomAdj + randomNoun + Math.floor(Math.random() * 1000);
}

document.getElementById("player_id_input").value = generateRandomNick();

function launchSocket() {
    document.getElementById("settings").hidden = true;
    document.getElementById("game_div").hidden = false;
    player_name = document.getElementById("player_id_input").value;
    game_id = document.getElementById("game_id_input").value;
    console.log("Joining wss://localhost:3000/game/" + game_id + "/" + player_name + "/")
    socket = new WebSocket("wss://localhost:3000/game/" + game_id + "/" + player_name + "/");
    socket.onopen = onOpen;
    socket.onmessage = onMessage;
    socket.onerror = onError;
}

function onOpen(e) {
    console.log("SELF : Connexion WebSocket établie");
    socket.send(
        JSON.stringify(
            {
                'from': player_name,
                'action' :"wannaplay!",
            }
        )
    );
}

function onMessage(e) {
    data = JSON.parse(e.data);
    // if (data.action != "move")
    console.log(data);
    if (data.action == "info") {
        ball[0] = data.ball[0];
        ball[1] = data.ball[1];
        ball_dx = data.ball_dir[0];
        ball_dy = data.ball_dir[1];
        pad[LEFT_PLAYER] = data.lpos;
        pad[RIGHT_PLAYER] = data.rpos;
        document.getElementById("lscore").innerText = data.lscore;
        document.getElementById("rscore").innerText = data.rscore;
    }
    if (data.action =="move") {
        move[data.from] = data.key;
        return;
    }
    if (!playing && data.action == "init") {
        side = data.side;
        ball_dx = data.dir[0];
        ball_dy = data.dir[1];
        document.getElementById("game_id").innerText = game_id
        pad[LEFT_PLAYER] = data.lpos;
        pad[RIGHT_PLAYER] = data.rpos;
        document.getElementById("lplayer").innerText = data.lplayer
        document.getElementById("rplayer").innerText = data.rplayer
        playing = true;
        console.log('PLAY !')
        requestAnimationFrame(play);
        return;
    }
};

function onError(e) {
    console.error(e.message);
};

///////////////////////////  Events part ///////////////////////////

window.addEventListener('beforeunload', function(event) {
    if (socket) {
        socket.close();
        console.log("WebSocket closed due to page unload.");
    }
});

field.setAttribute('tabindex', '0'); // Make playground focusable
field.focus();

// Add event listeners for keydown
field.addEventListener('keydown', keydown)
field.addEventListener('keyup', keyup)

function keydown(event) {
    if (KeyStillDown)
        return;
    key = event.key; // Get the key pressed
    if (key === 'q') {
        KeyStillDown = 'q';
        socket.send(JSON.stringify({ "from": side, "action": "move", "key": "-1" }));
        move[side] = -1;
    }
    else if (key === 'z') {
        KeyStillDown = 'z';
        socket.send(JSON.stringify({ "from": side, "action": "move", "key": "1" }));
        move[side] = 1;
    }
}

function keyup(event) {
    if (event.key !== KeyStillDown)
        return
    KeyStillDown = false
    socket.send(JSON.stringify({ "from": side, "action": "move", "key": "0" }));
    move[side] = 0;
}

// Click to refocus on field if needed
field.addEventListener('click', () => {
  field.focus();
});

/////////////////////////// Game display part ///////////////////////////

function movePaddles() {
    // pad[LEFT_PLAYER] += move[LEFT_PLAYER] * 2;
    // if (pad[LEFT_PLAYER] < 0)
    //     pad[LEFT_PLAYER] = 0;
    // if (pad[LEFT_PLAYER] + PADWIDTH > field.offsetHeight)
    //     pad[LEFT_PLAYER] = field.offsetHeight - PADWIDTH;
    // pad[RIGHT_PLAYER] += move[RIGHT_PLAYER] * 2;
    // if (pad[RIGHT_PLAYER] < 0)
    //     pad[RIGHT_PLAYER] = 0;
    // if (pad[RIGHT_PLAYER] + PADWIDTH > field.offsetHeight)
    //     pad[RIGHT_PLAYER] = field.offsetHeight - PADWIDTH;
    lpad.style.top = pad[LEFT_PLAYER] + 'px';
    rpad.style.top = pad[RIGHT_PLAYER] + 'px';
}

function side_collision(side) {
    // check paddle collision
    if (pad[side] <= ball[1] && ball[1] <= pad[side] + PADWIDTH)
        ball_dx = -ball_dx;
}

function moveBall() {
    // // Move
    // ball[0] += ball_dx
    // ball[1] += ball_dy
    // // Check top / bottom collision
    // if (ball[1] <= 0 || ball[1] + RADIUS >= field.height)
    //     ball_dy = -ball_dy;
    // // Check paddle left / right collision
    // if (ball[0] <= 20)
    //     side_collision(LEFT_PLAYER);
    // if (ball[0] + RADIUS >= field.width - 20)
    //     side_collision(RIGHT_PLAYER);
    ball_div.style.left = ball[0] + 'px'
    ball_div.style.top = ball[1] + 'px'
}

function play() {
    movePaddles();
    moveBall();
    requestAnimationFrame(play);
}