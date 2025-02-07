import { state } from './main.js';
export class Game {


    constructor() {
        this.socket = null;
    }

    launchGameSocket() {
        let socketURL = "wss://" + window.location.hostname + ":3000/game/4/?t=" + state.client.accessToken;
        this.socket = new WebSocket(socketURL);
        this.socket.onerror = async function(e) {
            console.error(e.message);
        };
    
        this.socket.onopen = async function(e) {
            await this.send(JSON.stringify({
                // 'from': state.client.userName,
                'action' :"wannaplay!",
                })
            );
        };
        
        this.socket.onclose = async function(e) {
        };
    
        this.socket.onmessage = async function(e) {
            let data = JSON.parse(e.data);
            console.log('data = ' + data);
            if (data.action == "info") {
                console.log('info');
            }
            if (data.action =="move") {
                console.log('info');
            }
            if (data.action == "disconnect") {
                this.playing = false;
                this.close();
                cancelAnimationFrame(raf);
            }
        };
    }

    addEventlistener() {
        document.getElementById("btn-test-game").addEventListener('click', this.launchGameSocket);
    }

	send(data) {
		this.socket.send(data);
	}

    close() {
        this.socket.close();
        this.socket = null;
    }
}

/////////////////////////// Events part ///////////////////////////

// function keydown(event) {
//     if (KeyStillDown)
//         return;
//     key = event.key; // Get the key pressed
//     if (key === 'q') {
//         KeyStillDown = 'q';
//         socket.send(JSON.stringify({ "from": side, "action": "move", "key": "-1" }));
//         move[side] = -1;
//     }
//     else if (key === 'z') {
//         KeyStillDown = 'z';
//         socket.send(JSON.stringify({ "from": side, "action": "move", "key": "1" }));
//         move[side] = 1;
//     }
// }

// function keyup(event) {
//     if (event.key !== KeyStillDown)
//         return
//     KeyStillDown = false
//     socket.send(JSON.stringify({ "from": side, "action": "move", "key": "0" }));
//     move[side] = 0;
// }

// // Click to refocus on field if needed
// field.addEventListener('click', () => {
//   field.focus();
// });

/////////////////////////// Game display part ///////////////////////////

// function movePaddles() {
//     lpad.style.top = pad[LEFT_PLAYER] + 'px';
//     rpad.style.top = pad[RIGHT_PLAYER] + 'px';
// }

// function moveBall() {
//     ball_div.style.left = ball[0] + 'px'
//     ball_div.style.top = ball[1] + 'px'
// }

// function play() {
//     if (playing) {
//         console.log("rAFing...")
//         movePaddles();
//         moveBall();
//         requestAnimationFrame(play);
//     }
//     else
//         console.log("Not playing");
// }