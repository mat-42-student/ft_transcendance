import { state } from "./main.js";
import * as UTILS from "./utils.js";
import {MathUtils, Vector2} from 'three';
import input from "input";
import * as LEVELS from './game3d/gameobjects/levels/_exports.js';
import LevelBase from './game3d/gameobjects/levels/LevelBase.js';
import { GameBase } from "./GameBase.js";


//TODO AI: predict impact and go there, since shallow angles move faster than the paddle
//TODO AI: margin choice: pick a redirection that tries to bring the angle within a range (not too direct, not too slow)
//TODO AI: new logic for randomization is needed
//TODO victory screen and transition to idle?
//TODO CPU game should have a timer (highscore?)
//TODO whole game speed should be scaled by 1 variable (faster game doesnt change ratio of ball speed to paddle speed unless they are explicitly scaled separately)
//REVIEW Exceptions should be caught, and should terminate the game


export class LocalGame extends GameBase {

    constructor (
        isCPU = false,
        angleMax = 70
    ) {
        super();

        this.isCPU = isCPU;
        this.angleMax = MathUtils.degToRad(angleMax);

        // game simulation stats - might want to keep these numbers synced with web game
        this.ballSpeed = 0.18;
        this.paddleSpeeds = [0.12, 0.12];
        this.paddleHeights = [0.2, 0.2];
        this.maxScore = 5;

        this.ballDirection = new Vector2(1.0, 1.0).normalize();
        this.roundStartSide = Math.random() > 0.5 ? 1 : 0;

        this.level = new (LEVELS.pickRandomLevel())();
        this.level.load();  //TODO do something with return, async thing, maybe do this last?

        this.playerNames[0] = 'Player 1';
        this.playerNames[1] = isCPU ? this.generateRandomNick() : 'Player 2';

        this.scores = [0, 0];
        this.side = isCPU ? 0 : 2;  // Neutral (2) if keyboard PVP

        //TODO wait for level to finish loading before continuing
        this.newRound();
    }

	frame(delta, time) {
        this.movePaddles(delta);
        this.moveBall(delta);

        super.frame(delta, time);
	}

    close() {
        this.endgame(true);

        super.close();
    }


    // MARK: Utils

    generateRandomNick() {
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
    bounce1D(pos, mirror) {
        return -(pos - mirror) + mirror;
    }


    // MARK: Game engine

    newRound() {
        this.ballPosition = { x: 0, y: 0 };
        __ballDirection.set(1, 0).rotateAround(
            new Vector2(0, 0),
            UTILS.RAD180 * roundStartSide
        );
        this.paddlePositions[0] = this.paddlePositions[1] = 0;

        // Shrink
        this.paddleHeights[0] *= 0.9;
        this.paddleHeights[1] = this.paddleHeights[0];

        // Accelerate
        __ballSpeed *= 1.2;
        __paddleSpeeds[0] *= 1.2;
        __paddleSpeeds[1] = __paddleSpeeds[0];
    }

    cpuMove() {
        // CPU tries to keep the ball in the center.
        // This margin multiplies the size of the paddle.
        const margin = 0.5;

        // Abbreviate
        const ball = this.ballPosition.y;
        const paddle = this.paddlePositions[1];
        const halfSize = this.paddleHeights[1] / 2;

        if (ball < paddle - halfSize * margin)
            return -1;
        if (ball > paddle + halfSize * margin)
            return 1;
        return 0;
    }

    movePaddles(delta) {
        let inputs = input.currentPaddleInputs;
        if (__isCPU) inputs[1] = this.cpuMove();

        const limit = this.level.size.y / 2;
        for (let i = 0; i < 2; i++) {
            this.paddlePositions[i] += delta * __paddleSpeeds[i] * inputs[i];
            this.paddlePositions[i] = MathUtils.clamp(this.paddlePositions[i],
                -limit, limit);
        }
    }

    moveBall(delta) {
        this.ballPosition.x += delta * __ballDirection.x * __ballSpeed;
        this.ballPosition.y += delta * __ballDirection.y * __ballSpeed;

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
                    x: this.level.size.x / 2 - Math.abs(this.ballPosition.x),
                    y: this.level.size.y / 2 - Math.abs(this.ballPosition.y),
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
                const pHeight = this.paddleHeights[collisionSide] / 2;
                const ballTooLow = this.ballPosition.y < this.paddlePositions[collisionSide] - pHeight;
                const ballTooHigh = this.ballPosition.y > this.paddlePositions[collisionSide] + pHeight;
                if (ballTooLow || ballTooHigh) {
                    this.scoreup(collisionSide === 1 ? 0 : 1);
                    break;
                } else {
                    const signedSide = collisionSide == 0 ? 1 : -1;

                    const hitPosition = UTILS.map(this.ballPosition.y,
                        this.paddlePositions[collisionSide] - pHeight,
                        this.paddlePositions[collisionSide] + pHeight,
                        -1,
                        1
                    );

                    let angle = __ballDirection.angle();
                    if (angle > UTILS.RAD180) {
                        angle = -signedSide * ((collisionSide == 0 ? UTILS.RAD360 : UTILS.RAD180) - angle);
                    }

                    if (angle > UTILS.RAD90) {
                        angle = UTILS.RAD90 - (angle - UTILS.RAD90);
                    }

                    angle = MathUtils.clamp(angle, -__angleMax, __angleMax);

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
            this.ballPosition[collisionAxis] = this.bounce1D(this.ballPosition[collisionAxis],
                this.level.size[collisionAxis] * (__ballDirection[collisionAxis] > 0 ? 0.5 : -0.5)
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

    scoreup(side) {
        this.scores[side]++;

        roundStartSide = side == 0 ? 1 : 0;

        if (this.scores[side] >= this.maxScore) {
            this.endgame(false);
            return;
        }
        this.newRound();
    }

    /** @param {boolean} isEndingBecauseCancelled */
    endgame(isEndingBecauseCancelled) {
        if (isEndingBecauseCancelled !== true) {
            let winner = this.scores[0] >= this.maxScore ? 0 : 1;
            alert(`GAME OVER\nLe gagnant est ${this.playerNames[winner]}!`);
        }
    }
}
