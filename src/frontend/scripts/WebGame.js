import { state } from './main.js';
import { GameBase } from './GameBase.js';


export class WebGame extends GameBase {

    constructor() {
        super();

        this.socket = null;

        this.side = 0; //TODO server needs to say this
        // this.level = ;//TODO server needs to say this. (also, load it?)
        this.playerNames[0] = state.client.userName;
        // this.playerNames[1] = //TODO server needs to say this
    }

    frame(delta, time) {
        this.#sendInput();

        super.frame(delta, time);
    }

    close() {
        this.socket.close();

        super.close();
    }


    launchGameSocket() {
        let socketURL = "wss://" + window.location.hostname + ":3000/game/4/?t=" + state.client.accessToken;
        // websocat --insecure wss://nginx:3000/game/1234/?t=pouetpouet
        // websocat ws://pong:8006/game/1234/?t
        this.socket = new WebSocket(socketURL);
        this.socket.onerror = async function(e) {
            console.error(e.message);
        };

        this.socket.onopen = async function(e) {
            this.send(JSON.stringify({
                // 'from': state.client.userName,
                'action' :"wannaplay!",
                })
            );
        };

        this.socket.onclose = async function(e) {
            this.socket = null;
        };

        this.socket.onmessage = async function(e) {
            let data = JSON.parse(e.data);
            console.log('data = ' + data);
            if (data.action == "info") {
                console.log('info');
                this.ballPosition.x = data.ball[0];
                this.ballPosition.y = data.ball[1];
                this.paddlePositions[0] = data.lpos;
                this.paddlePositions[1] = data.rpos;
                this.paddleHeights[0] = data.size[LEFT_PLAYER];
                this.paddleHeights[1] = data.size[RIGHT_PLAYER];
                this.scores[0] = data.lscore;
                this.scores[1] = data.rscore;
            }
            if (data.action == "disconnect") {
                console.log('Server asked for disconnect');
                this.close();
            }
        };
    }

    addEventlistener() {
        document.getElementById("btn-test-game").addEventListener('click', this.launchGameSocket);
    }


    #sendInput() {
        let currentInput = state.input.getPaddleInput(this.side);
        if (this.previousInput != currentInput) {
            this.socket.send(JSON.stringify({
                "action": "move",
                "key": currentInput
            }));
            this.previousInput = currentInput;
        }
    }

}
