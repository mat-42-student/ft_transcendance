/////////////////////////// onLoad ///////////////////////////
let matchmakingSocket, socket;
let ball = [];
field = document.getElementById("pong_field");
playing = false;
KeyStillDown = false;
move[LEFT_PLAYER] = move[RIGHT_PLAYER] = 0;
size[LEFT_PLAYER] = size[RIGHT_PLAYER] = PADWIDTH;
lpad = document.getElementById("player1");
rpad = document.getElementById("player2");
ball_div = document.getElementById("ball");

/////////////////////////// Socket part ///////////////////////////

function launchSocket(player_name, game_id, mmsocket) {
    matchmakingSocket = mmsocket;
    console.log("Joining wss://" + window.location.hostname + ":3000/game/" + game_id + "/")
    socket = new WebSocket("wss://" + window.location.hostname + ":3000/game/" + game_id + "/");

    socket.onerror = async function(e) {
        console.error(e.message);
    };

    socket.onopen = async function(e) {
        await socket.send(JSON.stringify({
            'from': player_name,
            'action' :"wannaplay!",
            })
        );
    };
    
    socket.onclose = async function(e) {
        await matchmakingSocket.send(JSON.stringify({
            action: 'send_data',
            payload: {
                endgame: true,
                mode: game_mode,
            }
        }));
        inject_code_into_markup("./matchmaking.html", "main", null);
    };

    socket.onmessage = async function (e) {
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
            size[LEFT_PLAYER] = data.size[LEFT_PLAYER];
            size[RIGHT_PLAYER] = data.size[RIGHT_PLAYER];
            document.getElementById("lscore").innerText = data.lscore;
            document.getElementById("rscore").innerText = data.rscore;
            document.getElementById("player1").style.height = size[LEFT_PLAYER] + 'px';
            document.getElementById("player2").style.height = size[RIGHT_PLAYER] + 'px';
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
            raf = requestAnimationFrame(play);
            return;
        }
        if (data.action == "disconnect") {
            socket.close();
            cancelAnimationFrame(raf);
        }
    };
}

/////////////////////////// Events part ///////////////////////////

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
    lpad.style.top = pad[LEFT_PLAYER] + 'px';
    rpad.style.top = pad[RIGHT_PLAYER] + 'px';
}

function moveBall() {
    ball_div.style.left = ball[0] + 'px'
    ball_div.style.top = ball[1] + 'px'
}

function play() {
    movePaddles();
    moveBall();
    requestAnimationFrame(play);
}