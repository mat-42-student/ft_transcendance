import engine from "engine";
import global from "global";
import input from "input";
import {MathUtils} from "three";
import * as LEVELS from './game3d/gameobjects/levels/_exports.js';
import LevelBase from './game3d/gameobjects/levels/LevelBase.js';

// FIXME ball position is NaN
//TODO add paddles

// MARK: Variables
// NOTE: All the values here are only an example of the data structures. (also helps intellisense)
//       Actual default values are set in functions.
//       Changing them here will do nothing.

let __ballDirection = {x: 1.0, y: 1.0};
let __ballSpeed = 1;
let __isCPU = true;
let __paddleSpeeds = [1, 1];
const __maxScore = 10;
/** @type {LevelBase} */
let __level;

/**
 * These parameters control the CPU's deliberate mistakes, to tweak difficulty.
 * When playing normally, the CPU will wait a random amount of time between delayMin/Max.
 * Then it 'gets distracted' and stops moving for a random amount of time between durationMin/Max.
 */
let __cpuMistake = {
    delay: { min: 1, max: 2 },
    duration: { min: 1, max: 2 },
};


// MARK: Utils

function generateRandomNick() {
    const adjectives = ["Shadow", "Steady", "Mighty", "Funny", "Hidden", "Normal"];
    const nouns = ["Ficus", "Pidgin", "Rock", "Pillow", "Curtains", "Hobo"];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return '[BOT] ' + randomAdj + randomNoun + Math.floor(Math.random() * 1000);
}

function randomInRange(a, b) {
    let range = Math.random() < 0.5 ? [-b, -a] : [a, b];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

/**
 * Used for 'folding' the ball's position along the board's edge.
 * https://www.desmos.com/calculator/a2vy4fey6u
 */
function bounce1D(pos, mirror) { return -(pos - mirror) + mirror; }


// MARK: Game engine

export async function startLocalGame(isCPU) {
    if (global.isPlaying == true) throw Error("Already playing??");
    __isCPU = isCPU;
    global.isPlaying = true;
    engine.loading = true;

    __cpuMistake.delay.min = 0.1;
    __cpuMistake.delay.max = 1.8;
    __cpuMistake.duration.min = 0.05;
    __cpuMistake.duration.max = 0.2;

    __ballSpeed = 0.005;
    __paddleSpeeds[0] = __paddleSpeeds[1] = 0.1;

    __level = new (LEVELS.pickRandomLevel())();

    const size = global.unitRect(__level.boardDiagonal);
    global.game.boardSize.x = size.x;
    global.game.boardSize.y = size.y;

    global.game.playerNames[1] = isCPU ? generateRandomNick() : 'Player 2';

    global.game.scores = [0, 0];
    global.game.focusedPlayerIndex = isCPU ? 0 : -1;

    engine.loading = false;
    newRound();
    global.gameCancelFunction = () => {
        endgame(true);
    };
    global.gameFrameFunction = (delta, time) => {
        movePaddles();
        moveBall();
        __level.onFrame(delta, time);
    };
}

function newRound() {
    global.game.ballPosition = { x: 0, y: 0 };
    __ballDirection = { x: 0.785, y: 0.785 };
    global.game.paddlePositions[0] = global.game.paddlePositions[1] = 0;

    // Shrink
    global.game.paddleHeights[0] *= 0.9;
    global.game.paddleHeights[1] = global.game.paddleHeights[0];

    // Accelerate
    __ballSpeed *= 1.2;
    __paddleSpeeds[0] *= 1.2;
    __paddleSpeeds[1] = __paddleSpeeds[0];
}

function cpuMove() {
    // TODO artificial mistakes

    // CPU tries to keep the ball in the center.
    // This margin multiplies the size of the paddle.
    const margin = 0.5;

    // Abbreviate
    const ball = global.game.ballPosition.y;
    const paddle = global.game.paddlePositions[1];
    const halfSize = global.game.paddleHeights[1] / 2;

    if (ball <= paddle - halfSize * margin)
        return 1;
    if (ball >= paddle + halfSize * margin)
        return -1;
    return 0;
}

function movePaddles(delta) {
    let inputs = input.currentPaddleInputs;
    if (__isCPU) inputs[1] = cpuMove();

    const limit = global.game.boardSize.y;
    for (let i = 0; i < 2; i++) {
        global.game.paddlePositions[i] += delta * __paddleSpeeds[i] * inputs[i];
        global.game.paddlePositions[i] = global.clamp(global.game.paddlePositions[i],
            -limit, limit);
    }
}

function moveBall(delta) {
    global.game.ballPosition.x += delta * __ballDirection.x * __ballSpeed;
    global.game.ballPosition.y += delta * __ballDirection.y * __ballSpeed;

    // At this point the ball's position has been linearly extrapolated forward
    // for this point in time.
    // Now, we check for collisions.
    // If it collides, the ball's position (and direction) is 'folded' along the
    // edge that it hit, until it no longer collides.

    for (let bounces = 0; true; bounces++) {
        if (bounces >= 3) console.warn('Suspiciously high number of ball bounces in 1 frame:', bounces);

        let collision = null;
        {
            // Negative numbers mean collisions.
            let collisions = {
                x: global.game.boardSize.x  / 2 - Math.abs(global.game.ballPosition.x),
                y: global.game.boardSize.y / 2 - Math.abs(global.game.ballPosition.y),
            };

            if (collisions.x < 0.0) {
                collision = 'x';
            } else if (collisions.y < 0.0 && collisions.x < collisions.y) {  // Pick the closest edge
                collision = 'y';
            }
        }

        if (collision === null) {
            break;
        } else if (collision === 'x') {
            const side = __ball_direction.x > 0.0 ? 1 : 0;
            const pHeight = global.game.paddleHeights[side];  // line too long lmao
            if ((global.game.ballPosition.y < global.game.paddlePositions[side] - pHeight)
             || (global.game.ballPosition.y < global.game.paddlePositions[side] + pHeight)) {
                scoreup(side === 1 ? 0 : 1);
                break;
            } else {
                //TODO bend __ballDirection based on where ball hits the paddle.
            }
        } else { // (collision === 'y')
        }

        // If execution reaches here, we have to perform a bounce.

        // All of the [collision] stuff has properties named .x or .y .
        // They're not even the same properties, but hey, JS is anarchy,
        // and right here it happens to be convenient.
        global.game.ballPosition[collision] = bounce1D(global.game.ballPosition[collision],
            __ballDirection[collision] > 0 ? halfBoard[collision] : -halfBoard[collision]);
        __ballDirection[collision] *= -1;
    }
}

function scoreup(side) {
    global.game.scores[side]++;

    if (global.game.scores[side] >= __maxScore) {
        endgame(false);
        return;
    }
    newRound();
}

/** @param {boolean} isEndingBecauseCancelled */
function endgame(isEndingBecauseCancelled) {
    if (isEndingBecauseCancelled !== true) {
        let winner = global.game.scores[0] >= __maxScore ? 0 : 1;
        alert(`GAME OVER\nLe gagnant est ${global.game.playerNames[winner]}!`);
    }

    global.isPlaying = false;
    global.gameSimulation.gameFrameFunction = null;
    global.gameSimulation.gameCancelFunction = null;

    __level.dispose();
    __level = null;

    window.location.hash = 'matchmaking.html';
}
