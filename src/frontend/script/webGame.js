import {MathUtils, Vector2} from 'three';
import engine from "engine";
import global from "./global.js";
import input from "input";
import * as LEVELS from './game3d/gameobjects/levels/_exports.js';
import LevelBase from './game3d/gameobjects/levels/LevelBase.js';


const gg = global.game;  // abbreviate because used a lot

let matchmakingSocket;
let socket;
let previousInput;
let playerIndex = 0;


export async function startWebGame() {
	connect(); //TODO args

    global.gameCancelFunction = () => {
        endgame(true);
    };

    global.gameFrameFunction = (delta, time) => {
        if (!global.isPlaying) {
            console.warn('Game frame called while not playing');
            return;
        }
        sendInput();
        updateGameValues();
        if (__level == null) {
            console.warn('Game frame called while level is missing');
            return;
        }
        __level.onFrame(delta, time);
    };

}


function sendInput() {
	let currentInput = input.currentPaddleInputs[playerIndex];
	if (previousInput != currentInput) {
		socket.send(JSON.stringify({ 
			"from": playerIndex, 
			"action": "move", 
			"key": currentInput 
		}));
	}
	previousInput = currentInput;
}


function connect(player_name, game_id, mmsocket) {
    matchmakingSocket = mmsocket;
	socket = new WebSocket("wss://" + window.location.hostname + ":3000/game/" + game_id + "/");

    socket.onerror = async function(e) {
        console.error("Game socket:", e.message);
    };

    socket.onopen = async function(e) {
        await socket.send(JSON.stringify({
            'from': player_name,
            'action' :"wannaplay!",
            })
        );
    };
    
    socket.onclose = async function(e) {
		// console.log('game_mode (onclose):' + game_mode);
        await matchmakingSocket.send(JSON.stringify({
            action: 'send_data',
            payload: {
                'endgame': true,
                'mode': game_mode,
            }
        }));

        //TODO what's the difference between this and global.gameCancelFunction?
    };

    socket.onmessage = async function(e) {
        data = JSON.parse(e.data);
		// console.log('data = ' + data);
        if (data.action == "info") {
            gg.ballPosition.x = data.ball[0];
            gg.ballPosition.y = data.ball[1];
            gg.paddlePositions[0] = data.lpos;
            gg.paddlePositions[1] = data.rpos;
            gg.paddleHeights[0] = data.size[LEFT_PLAYER];
            gg.paddleHeights[1] = data.size[RIGHT_PLAYER];
            gg.scores[0] = data.lscore;
            gg.scores[1] = data.rscore;
        }
        if (data.action == "init") {
            playerIndex = data.side;
			game_mode = data.mode;
			console.log('INIT : game_mode -> ' + game_mode);
            gg.paddlePositions[0] = data.lpos;
            gg.paddlePositions[1] = data.rpos;
            // document.getElementById("lplayer").innerText = data.lplayer;
            // document.getElementById("rplayer").innerText = data.rplayer;
            playing = true;
            // raf = requestAnimationFrame(play);
            return;
        }
        if (data.action == "disconnect") {
            console.log("DISCONNECTING");
            playing = false;
            socket.close();
            cancelAnimationFrame(raf);
        }
    };  // socket.onmessage
}


/** @param {boolean} isEndingBecauseCancelled */
function endgame(isEndingBecauseCancelled) {
	//TODO wip

    if (isEndingBecauseCancelled !== true) {
        let winner = gg.scores[0] >= gg.maxScore ? 0 : 1;
        alert(`GAME OVER\nLe gagnant est ${gg.playerNames[winner]}!`);
    }

    global.isPlaying = false;
    global.gameFrameFunction = null;
    global.gameCancelFunction = null;
}
