import { chooseHeader, state } from '../main.js';
import { GameBase } from './GameBase.js';
import * as LEVELS from '../game3d/gameobjects/levels/levels.js';
import { navigator } from '../nav.js'


export class WebGame extends GameBase {

    constructor() {
        super();

        this.socket = null;

        this.side = 2;  // Set to neutral until server tells us

        // quick and dirty fix for a cosmetic issue:
        // web game does not send this until game start, so the paddles would be invisible
        // for the initial countdown.
        this.paddleHeights = [0.2, 0.2];
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

    close(youCancelled) {
        try {
            if ((this.socket != null)
                &&(this.socket.readyState !== this.socket.CLOSED)
                &&(this.socket.readyState !== this.socket.CLOSING)
            ) {
                this.socket.close();
            }
            this.socket = null;
        } catch {
            console.warn('Double close on WebGame.socket');
        }

        try {
            if (youCancelled) {
				state.mmakingApp.cancelGame_with_pending_or_ingame_status()
                this.level.endShowYouRagequit();
            }
        } catch {}

        super.close(youCancelled);
    }


    async launchGameSocket(gameId) {
        await state.client.refreshSession();
		await navigator.goToPage('');
        let socketURL = "wss://" + window.location.hostname + ":3000/game/" + gameId + "/?t=" + state.client.accessToken;
        // websocat ws://pong:8006/game/1234/?t=

        try {
            this.socket = new WebSocket(socketURL);
            this.socket.gameApp = this;
        }
        catch (error) {
            console.error('Failed to create WebSocket:', error);
            return;
        }


        this.socket.onerror = async function(e) {
            console.error('Game socket: onerror:', e);
			await state.mmakingApp.socketGameError();
        };

        this.socket.onopen = async function(e) {
            this.send(JSON.stringify({
                'action' :"wannaplay!",
                })
            );

			await state.mmakingApp.socketGameGood();
        };

        this.socket.onclose = async function(e) {
            if (this.gameApp instanceof WebGame) {
                this.gameApp.socket = null;
                this.gameApp.close(false);
            }
        };

        this.socket.onmessage = async function(e) {
            let data = JSON.parse(e.data);
            const wg = this.gameApp;
            if (!(wg instanceof WebGame)) {
                console.error("WebGame.js: Received message on socket, but the active game app is not a WebGame.\n",
                    "Is an instance of WebGame, and its game socket, still reachable somewhere?\n",
                    "Data:", data,
                    "Socket:", self,
                );
                return;
            }

            // Debug with less spam from constant 'info' packets.
            // if (data.action != 'info') { console.log('Game packet:', data.action, ', data = ', data); }

            if (data.action == 'init') {
                wg.level = new (LEVELS.LIST[data.level_name])();
                wg.receivedInit = true;
                wg.side = Number(data.side);
                wg.playerNames[0] = data.lplayer;
                wg.playerNames[1] = data.rplayer;
                // Did we load before the server was ready? Then report it now.
                if (state.engine.scene != null) {
                    wg.sendLoadReady();
                } else {
                    wg.needToReportLoaded = true;
                }
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

                wg.level?.unpause();
            }
            if (data.action == "wait") {
                wg.level?.pause(Number(data.time));
            }
            if (data.action == "disconnect") {
                wg.close(false);
            }
            if (data.action == "game_cancelled") {
                const opponentName = wg?.playerNames[1 - wg.side];
                wg.level?.endShowWebOpponentQuit(opponentName);
            }
            if (data.action == "game_won") {
                wg.level?.endShowWinner(data.scores, data.winner, [...wg.playerNames]);
            }
        };
    }


    #sendInput() {
        if (!this.receivedInit || !state.isPlaying || this.socket.readyState != this.socket.OPEN)
            return;

        let currentInput = state.input.getPaddleInput(this.side);
        if (this.previousInput != currentInput) {
            let input = JSON.stringify({
                "action": "move",
                "key": currentInput
            });
            if (state.cliDebug)
                console.log('Game input:', input);
            this.socket.send(input);
            this.previousInput = currentInput;
        }
    }

    sendLoadReady() {
        if (!this.receivedInit) {
            console.error('Refused to send load_complete');
            return;
        }

        chooseHeader('ingame');
        this.needToReportLoaded = false;
        this.socket.send(JSON.stringify({
            "action": "load_complete",
        }));
    }

}
