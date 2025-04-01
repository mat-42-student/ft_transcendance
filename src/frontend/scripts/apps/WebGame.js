import { state } from '../main.js';
import { GameBase } from './GameBase.js';
import * as LEVELS from '../game3d/gameobjects/levels/_exports.js';


export class WebGame extends GameBase {

    constructor(levelName) {
        super();

        try {
            document.getElementById("keyhint-versus").style.display = null;
        } catch {}

        this.socket = null;

        this.side = 2;  // Set to neutral until server tells us
        this.level = new (LEVELS.LIST[levelName])();
        this.playerNames[0] = this.playerNames[1] = '-';
    }

    frame(delta, time) {
        if (this.needToReportLoaded && state.engine.scene) {
            this.sendLoadReady();
        }

        try {
            this.#sendInput();
        } catch (error) {
            console.error('Failed to send input', error);
        }

        super.frame(delta, time);
    }

    close() {
        try {
            this.socket.close();
            this.socket = null;
        } catch {}

        try {
            document.getElementById("keyhint-versus").style.display = "none";
        } catch {}

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
            if (state.gameApp instanceof WebGame) {
                state.gameApp.close();
            }
        };

        this.socket.onmessage = async function(e) {
            let data = JSON.parse(e.data);
            const wg = state.gameApp;
            if (!(wg instanceof WebGame)) {
                console.error("WebGame.js: Received message on socket, but the active game app is not a WebGame.\n",
                    "Is an instance of WebGame, and its game socket, still reachable somewhere?\n",
                    "Data:", data,
                    "Socket:", self,
                );
                return;
            }

            // Debug with less spam from constant 'info' packets.
            if (data.action != 'info') { console.log('Game packet:', data.action, ', data = ', data); }

            if (data.action == 'init') {
                wg.side = Number(data.side);
                wg.playerNames[0] = data.lplayer;
                wg.playerNames[1] = data.rplayer;
            }
            if (data.action == "info") {
                wg.ballPosition.x = data.ball[0];
                wg.ballPosition.y = data.ball[1];
                wg.paddlePositions[0] = data.lpos;
                wg.paddlePositions[1] = data.rpos;
                wg.paddleHeights[0] = data.size[0];
                wg.paddleHeights[1] = data.size[1];
                wg.scores[0] = data.lscore;
                wg.scores[1] = data.rscore;

                if (wg.level)  wg.level.unpause();
            }
            if (data.action == "wait") {
                if (wg.level)  wg.level.pause(Number(data.time));
            }
            if (data.action == "disconnect") {
                wg.close();
            }
            if (data.action == "ready") {
                // Did we load before the server was ready? Then report it now.
                if (state.engine.scene != null) {
                    wg.sendLoadReady();
                } else {
                    wg.needToReportLoaded = true;
                }
            }
            if (data.action == "game_cancelled") {
                wg.level.endShowWebQuit(data.quitter, [...wg.playerNames]);
            }
            if (data.action == "game_won") {
                wg.level.endShowWinner(data.scores, data.winner, [...wg.playerNames]);
            }
        };
    }

    addEventlistener() {
        document.getElementById("btn-test-game").addEventListener('click', this.launchGameSocket);
    }


    #sendInput() {
        if (!this.isReady || !state.isPlaying || this.socket.readyState != this.socket.OPEN)
            return;

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

    sendLoadReady() {
        if (this.isReady)
            return;
        this.isReady = true;

        this.needToReportLoaded = false;
        this.socket.send(JSON.stringify({
            "action": "load_complete",
        }));
    }

}
