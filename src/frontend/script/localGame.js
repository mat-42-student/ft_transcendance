import {MathUtils, Vector2} from 'three';
import engine from "engine";
import global from "global";
import input from "input";
import * as LEVELS from './game3d/gameobjects/levels/_exports.js';
import LevelBase from './game3d/gameobjects/levels/LevelBase.js';


//TODO AI: predict impact and go there, since shallow angles move faster than the paddle
//TODO AI: margin choice: pick a redirection that tries to bring the angle within a range (not too direct, not too slow)
//TODO AI: new logic for randomization is needed
//TODO victory screen and transition to idle?
//TODO CPU game should have a timer (highscore?)
//TODO whole game speed should be scaled by 1 variable (faster game doesnt change ratio of ball speed to paddle speed unless they are explicitly scaled separately)
//REVIEW Exceptions should be caught, and should terminate the game


const gg = global.game;  // abbreviate because used a lot

const __angleMax = MathUtils.degToRad(70);

// MARK: Variables
// NOTE: All the values here are only an example of the data structures. (also helps intellisense)
//       Actual default values are set in functions.
//       Changing them here will do nothing.

let __ballDirection = new Vector2(1.0, 1.0).normalize();
let __ballSpeed = 1;
let __isCPU = true;
let __paddleSpeeds = [1, 1];
/** @type {LevelBase} */  let __level;
let __didOpponentLoseLastRound = 0;


// MARK: Utils

function generateRandomNick() {
    const adjectives = ["Shadow", "Steady", "Mighty", "Funny", "Hidden", "Normal"];
    const nouns = ["Ficus", "Pidgin", "Rock", "Pillow", "Curtains", "Hobo"];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return '[BOT] ' + randomAdj + randomNoun + Math.floor(Math.random() * 1000);
}

/**
 * Used for 'folding' the ball's position along the board's edge.
 * https://www.desmos.com/calculator/a2vy4fey6u
 */
function bounce1D(pos, mirror) {
    return -(pos - mirror) + mirror;
}


// MARK: Game engine

export async function startLocalGame(isCPU) {
    if (global.isPlaying == true) throw Error("Already playing??");
    __isCPU = isCPU;
    global.isPlaying = true;
    engine.loading = true;

    if (__level != null) {
        __level.dispose();
        __level = null;
    }

    gg.maxScore = 5;

    __didOpponentLoseLastRound = Math.random() > 0.5 ? 1 : 0;

    __ballSpeed = 0.18;
    __paddleSpeeds[0] = __paddleSpeeds[1] = 0.12;
    gg.paddleHeights[0] = 0.2;
    gg.paddleHeights[1] = gg.paddleHeights[0];

    __level = new (LEVELS.pickRandomLevel())();

    const size = global.unitRect(__level.boardDiagonal);
    gg.boardSize.x = size.x;
    gg.boardSize.y = size.y;

    gg.playerNames[1] = isCPU ? generateRandomNick() : 'Player 2';

    gg.scores = [0, 0];
    if (gg.focusedPlayerIndex === 'neutral') {
        gg.focusedPlayerIndex = -1;
    } else {
        gg.focusedPlayerIndex = isCPU ? 0 : -1;
    }

    engine.loading = false;
    newRound();
    global.gameCancelFunction = () => {
        endgame(true);
    };
    global.gameFrameFunction = (delta, time) => {
        if (!global.isPlaying) {
            console.warn('Game frame called while not playing');
            return;
        }
        movePaddles(delta);
        moveBall(delta);
        if (__level == null) {
            console.warn('Game frame called while level is missing');
            return;
        }
        __level.onFrame(delta, time);
    };
}

function newRound() {
    gg.ballPosition = { x: 0, y: 0 };
    __ballDirection.set(1, 0).rotateAround(
        new Vector2(0, 0),
        global._180 * __didOpponentLoseLastRound
    );
    gg.paddlePositions[0] = gg.paddlePositions[1] = 0;

    // Shrink
    gg.paddleHeights[0] *= 0.9;
    gg.paddleHeights[1] = gg.paddleHeights[0];

    // Accelerate
    __ballSpeed *= 1.2;
    __paddleSpeeds[0] *= 1.2;
    __paddleSpeeds[1] = __paddleSpeeds[0];
}

function cpuMove() {
    // CPU tries to keep the ball in the center.
    // This margin multiplies the size of the paddle.
    const margin = 0.5;

    // Abbreviate
    const ball = gg.ballPosition.y;
    const paddle = gg.paddlePositions[1];
    const halfSize = gg.paddleHeights[1] / 2;

    if (ball < paddle - halfSize * margin)
        return -1;
    if (ball > paddle + halfSize * margin)
        return 1;
    return 0;
}

function movePaddles(delta) {
    let inputs = input.currentPaddleInputs;
    if (__isCPU) inputs[1] = cpuMove();

    const limit = gg.boardSize.y / 2;
    for (let i = 0; i < 2; i++) {
        gg.paddlePositions[i] += delta * __paddleSpeeds[i] * inputs[i];
        gg.paddlePositions[i] = global.clamp(gg.paddlePositions[i],
            -limit, limit);
    }
}

function moveBall(delta) {
    const gg = global.game;  // abbreviate because used a lot

    gg.ballPosition.x += delta * __ballDirection.x * __ballSpeed;
    gg.ballPosition.y += delta * __ballDirection.y * __ballSpeed;

    // At this point the ball's position has been linearly extrapolated forward
    // for this point in time.
    // Now, we check for collisions.
    // If it collides, the ball's position (and direction) is 'folded' along the
    // edge that it hit, until it no longer collides.

    let bounces = 0;
    for (; true; bounces++) {
        if (bounces > 100) {
            throw Error(`Bounced ${bounces} times in a single frame, interrupting infinite loop.`);
        }

        let collisionAxis = null;
        {
            // Negative numbers mean collisions.
            let collisions = {
                x: gg.boardSize.x / 2 - Math.abs(gg.ballPosition.x),
                y: gg.boardSize.y / 2 - Math.abs(gg.ballPosition.y),
            };

            if (collisions.x < 0.0) {
                collisionAxis = 'x';
            } else if (collisions.y < 0.0 && collisions.y < collisions.x) {  // Pick the closest edge
                collisionAxis = 'y';
            }
        }

        if (collisionAxis === null) {
            break;
        } else if (collisionAxis === 'x') {
            const collisionSide = __ballDirection.x > 0.0 ? 0 : 1;
            const pHeight = gg.paddleHeights[collisionSide] / 2;
            const ballTooLow = gg.ballPosition.y < gg.paddlePositions[collisionSide] - pHeight;
            const ballTooHigh = gg.ballPosition.y > gg.paddlePositions[collisionSide] + pHeight;
            if (ballTooLow || ballTooHigh) {
                scoreup(collisionSide === 1 ? 0 : 1);
                break;
            } else {
                const signedSide = collisionSide == 0 ? 1 : -1;

                const hitPosition = global.map(gg.ballPosition.y,
                    gg.paddlePositions[collisionSide] - pHeight,
                    gg.paddlePositions[collisionSide] + pHeight,
                    -1,
                    1
                );

                let angle = __ballDirection.angle();
                if (angle > global._180) {
                    angle = -signedSide * ((collisionSide == 0 ? global._360 : global._180) - angle);
                }

                if (angle > global._90) {
                    angle = global._90 - (angle - global._90);
                }

                angle = global.clamp(angle, -__angleMax, __angleMax);

                const redirection = hitPosition * 1.5;  // Arbitrary number, controls how strong redirection is

                const newAngle = MathUtils.clamp(
                    angle + redirection,
                    -__angleMax,
                    __angleMax
                );

                const newDirection = new Vector2(signedSide,0).rotateAround(new Vector2(), newAngle * signedSide);

//                 console.log(
// `Ball Direction: (Before)`, __ballDirection, `(After)`, newDirection,`
// Angle: ${MathUtils.RAD2DEG*angle}
// Redirect: ${MathUtils.RAD2DEG*redirection}
// New Angle: ${MathUtils.RAD2DEG*newAngle}`
//                 );

                __ballDirection.copy(newDirection);
            }
        } else { // (collisionAxis === 'y')
        }

        // If execution reaches here, we have to perform a bounce.

        // All of the [collision] stuff has properties named .x or .y .
        // They're not even the same properties, but hey, JS is anarchy,
        // and right here it happens to be convenient.
        gg.ballPosition[collisionAxis] = bounce1D(gg.ballPosition[collisionAxis],
            gg.boardSize[collisionAxis] * (__ballDirection[collisionAxis] > 0 ? 0.5 : -0.5)
        );
        __ballDirection[collisionAxis] *= -1;
    }

    if (bounces > 1) {
        console.warn(
`Ball bounced ${bounces} times in a single frame, which is unusual.
Did the game freeze long enough for the ball to travel to multiple borders?
Did the ball nearly exactly hit a corner of the board, and bounce twice?`
        );
    }
}

function scoreup(side) {
    gg.scores[side]++;

    __didOpponentLoseLastRound = side == 0 ? 1 : 0;

    if (gg.scores[side] >= gg.maxScore) {
        endgame(false);
        return;
    }
    newRound();
}

/** @param {boolean} isEndingBecauseCancelled */
function endgame(isEndingBecauseCancelled) {
    if (isEndingBecauseCancelled !== true) {
        let winner = gg.scores[0] >= gg.maxScore ? 0 : 1;
        alert(`GAME OVER\nLe gagnant est ${gg.playerNames[winner]}!`);
    }

    global.isPlaying = false;
    global.gameFrameFunction = null;
    global.gameCancelFunction = null;
}
