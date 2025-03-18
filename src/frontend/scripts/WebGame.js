import { state } from './main.js';
import { GameBase } from './GameBase.js';
import * as LEVELS from './game3d/gameobjects/levels/_exports.js';


export class WebGame extends GameBase {

    constructor(levelName, opponentName) {
        super();

        this.socket = null;

        this.side = 2;  // Set to neutral until server tells us
        this.level = new (LEVELS.LIST[levelName])();
        state.engine.scene = this.level;
        this.playerNames[0] = state.client.userName;
        this.playerNames[1] = opponentName;
    }

    frame(delta, time) {
        try {
            if (this.isPlaying)
                this.#sendInput();
        } catch (error) {
            console.error('Failed to send input', error);
        }

        super.frame(delta, time);
    }

    close() {
        this.socket.close();

        super.close();
    }


    launchGameSocket(gameId) {
        if (!gameId) // debug
            gameId = 1; // effacer asap
        
		state.client.refreshSession();
        let socketURL = "wss://" + window.location.hostname + ":3000/game/" + gameId + "/?t=" + state.client.accessToken;

        // websocat --insecure wss://nginx:3000/game/1234/?t=pouetpouet
        // websocat ws://pong:8006/game/1234/?t
        this.socket = new WebSocket(socketURL);
        this.socket.onerror = async function(e) {
            console.error('Game socket: onerror:', e);
        };

        this.socket.onopen = async function(e) {
            console.log('onopen', this)
            this.send(JSON.stringify({
                // 'from': state.client.userName,
                'action' :"wannaplay!",
                })
            );
        };

        this.socket.onclose = async function(e) {
            this.socket = null;
            this.isPlaying = false;
        };

        this.socket.onmessage = async function(e) {
            const wg = state.gameApp;
            wg.isPlaying = true;  //TODO this should be based on loading
            let data = JSON.parse(e.data);
            if (data.action != 'info')
                console.log('data = ', data);
            if (data.action == 'init') {
                console.log('init', data);
                state.gameApp.side = Number(data.side);
                state.gameApp.isPlaying = true;
            }
            if (data.action == "info") {
                console.log('info');
                wg.ballPosition.x = data.ball[0];
                wg.ballPosition.y = data.ball[1];
                wg.paddlePositions[0] = data.lpos;
                wg.paddlePositions[1] = data.rpos;
                wg.paddleHeights[0] = data.size[0];
                wg.paddleHeights[1] = data.size[1];
                wg.scores[0] = data.lscore;
                wg.scores[1] = data.rscore;
            }
            if (data.action == "wait") {
                console.log('waiting');
            }
            if (data.action =="move") {
                console.log('info');
            }
            if (data.action == "disconnect") {
                console.log('Server asked for disconnect');
                wg.close();
                // wg = null; ???
            }
        };
    }

    addEventlistener() {
        document.getElementById("btn-test-game").addEventListener('click', this.launchGameSocket);
    }


    #sendInput() {
        let currentInput = state.input.getPaddleInput(this.side);
        if (this.previousInput != currentInput) {
            let input = JSON.stringify({
                "action": "move",
                "key": currentInput
            });
            this.socket.send(input);
            this.previousInput = currentInput;
        }
    }

}
