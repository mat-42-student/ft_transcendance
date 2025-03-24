import { state } from "./main.js";
import * as UTILS from "./utils.js";
import {MathUtils, Vector2} from 'three';
import * as LEVELS from './game3d/gameobjects/levels/_exports.js';
import { GameBase } from "./GameBase.js";


//REVIEW Exceptions should be caught, and should terminate the game


// Controls how the game runs.
// Should be (manually) kept in sync with game/const.py
const STATS = JSON.parse(`
{
    "initialPadSize": 0.2,
    "initialPadSpeed": 0.12,
    "padShrinkFactor": 0.9,
    "padAccelerateFactor": 1.2,

    "initialBallSpeed": 0.18,
    "ballAccelerateFactor": 1.2,
    "redirectionFactor": 1.5,
    "maxAngleDeg": 70.0,

    "maxScore": 5
}
`);

// 0: perfect accuracy
// 1: use the whole paddle (might miss)
// >1: allow missing
const __AI_MAX_ERROR = 0.5;


export class LocalGame extends GameBase {

    constructor (isCPU = false) {
        super();

        this.isCPU = isCPU;
        this.cpuTarget = 0;
        this.waitTime = 0;

        // game simulation stats - might want to keep these numbers synced with web game
        this.ballSpeed = STATS.initialBallSpeed;
        this.paddleSpeeds = [STATS.initialPadSpeed, STATS.initialPadSpeed];
        this.paddleHeights = [STATS.initialPadSize, STATS.initialPadSize];
        this.maxScore = STATS.maxScore;

        this.roundStartSide = Math.random() > 0.5 ? 1 : 0;

        this.playerNames[0] = 'Player 1';
        this.playerNames[1] = isCPU ? this.generateRandomNick() : 'Player 2';

        this.side = isCPU ? 0 : 2;  // Neutral (2) if keyboard PVP

        this.level = new (LEVELS.pickRandomLevel())();  // randomly select class, then construct it
        state.engine.scene = this.level;

        this.pause();
        this.recenter();
    }

	frame(delta, time) {
        this.waitTime = Math.max(0, this.waitTime - delta);

        if (this.waitTime <= 0) {
            if (this.level)  this.level.unpause();

            if (this.cpuDecideIn != NaN)
                this.cpuDecideIn = Math.max(0, this.cpuDecideIn - delta);
            if (this.cpuDecideIn === 0)
                this.cpuDecide();

            this.movePaddles(delta);
            this.moveBall(delta);
        }

        super.frame(delta, time);
	}

    close(cancelled = true) {
        this.endgame(cancelled);

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


    // MARK: Game simulation

    recenter() {
        this.ballPosition = new Vector2(0, 0);
        this.ballDirection = new Vector2(this.roundStartSide ? -1 : 1, 1).normalize()
        this.paddlePositions[0] = this.paddlePositions[1] = 0;
        this.cpuDecideIn = 0.1;
    }


    newRound() {
        this.recenter();

        this.paddleHeights[1] = this.paddleHeights[0] *= STATS.padShrinkFactor;

        this.ballSpeed *= STATS.ballAccelerateFactor;
        this.paddleSpeeds[1] = this.paddleSpeeds[0] *= STATS.padAccelerateFactor;

        this.pause();
    }

    cpuDecide() {
        this.cpuDecideIn = NaN;
        if (this.ballDirection.x < 0)
            this.cpuFindTarget();
        else
            this.cpuTarget = 0;
    }

    cpuFindTarget() {
        // This function is a port of https://www.desmos.com/calculator/revv9si2to

        let a = this.ballPosition.clone();
        let b = this.ballPosition.clone().add(this.ballDirection);

        let slope = (b.y - a.y) / (b.x - a.x)
        let offset = a.y - slope * a.x;

        // Reimplementing a modulo function, because JS % is not the intended behaviour of modulo.
        // This way, it matches my Desmos visualization.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder#description
        let mod = (n, d) => { return ((n % d) + d) % d; }

        let line = (x) => { return slope * x + offset; };
        let sawWave = (x) => { return mod(line(x) + 0.5, 1) - 0.5; };
        let squareWave = (x) => { return -Math.sign(mod(0.5 * slope * x + 0.5 * offset + 0.25, 1) - 0.5); };
        let triangleWave = (x) => { return sawWave(x) * squareWave(x); };

        // Assumes bot player is always player index 1
        let wallX = -(this.level.boardSize.x / 2);
        this.cpuTarget = triangleWave(wallX);

        const randomizer = __AI_MAX_ERROR
            * (this.paddleHeights[1] / 2)
            * (Math.random() * 2 - 1);
        this.cpuTarget += randomizer;
    }

    cpuSeekTarget() {
        const error = this.cpuTarget - this.paddlePositions[1];
        return error > 0 ? 1 : -1;
    }

    movePaddles(delta) {
        let inputs = [
            state.input.getPaddleInput(0),
            this.isCPU ? this.cpuSeekTarget() : state.input.getPaddleInput(1)
        ];

        const limit = this.level.boardSize.y / 2;
        for (let i = 0; i < 2; i++) {
            this.paddlePositions[i] += delta * this.paddleSpeeds[i] * inputs[i];
            this.paddlePositions[i] = MathUtils.clamp(this.paddlePositions[i],
                -limit, limit);
        }
    }

    moveBall(delta) {
        this.ballPosition.x += delta * this.ballDirection.x * this.ballSpeed;
        this.ballPosition.y += delta * this.ballDirection.y * this.ballSpeed;

        // At this point the ball's position has been linearly extrapolated forward
        // for this point in time.
        // Now, we check for collisions.
        // If it collides, the ball's position (and direction) is 'folded' along the
        // edge that it hit, until it no longer collides.

        let bounces = 0;
        for (; true; bounces++) {
            if (bounces > 2) {
                console.error(`Bounced ${bounces} times in a single frame, game appears to be lagging.`);
            }

            let collisionAxis = null;
            {
                // Negative numbers mean collisions.
                let collisions = {
                    x: this.level.boardSize.x / 2 - Math.abs(this.ballPosition.x),
                    y: this.level.boardSize.y / 2 - Math.abs(this.ballPosition.y),
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
                const collisionSide = this.ballDirection.x > 0.0 ? 0 : 1;
                const pHeight = this.paddleHeights[collisionSide] / 2;
                const ballTooLow = this.ballPosition.y < this.paddlePositions[collisionSide] - pHeight;
                const ballTooHigh = this.ballPosition.y > this.paddlePositions[collisionSide] + pHeight;
                if (ballTooLow || ballTooHigh) {
                    this.scoreup(collisionSide === 1 ? 0 : 1);
                    break;
                } else {

                    this.cpuDecideIn = 0.1;

                    const signedSide = collisionSide == 0 ? 1 : -1;

                    const hitPosition = UTILS.map(this.ballPosition.y,
                        this.paddlePositions[collisionSide] - pHeight,
                        this.paddlePositions[collisionSide] + pHeight,
                        -1,
                        1
                    );

                    const error = Math.round(Math.abs(hitPosition) * 100);
                    if (this.isCPU && collisionSide == 1 && error > (__AI_MAX_ERROR*100 + 5))
                        console.warn('Bot accuracy low:', error, '% error.');

                    let angle = this.ballDirection.angle();
                    if (angle > UTILS.RAD180) {
                        angle = -signedSide * ((collisionSide == 0 ? UTILS.RAD360 : UTILS.RAD180) - angle);
                    }

                    if (angle > UTILS.RAD90) {
                        angle = UTILS.RAD90 - (angle - UTILS.RAD90);
                    }

                    const maxAngleRad = MathUtils.degToRad(STATS.maxAngleDeg);
                    angle = MathUtils.clamp(angle, -maxAngleRad, maxAngleRad);

                    const redirection = hitPosition * STATS.redirectionFactor;

                    const newAngle = MathUtils.clamp(
                        angle + redirection,
                        -maxAngleRad,
                        maxAngleRad
                    );

                    const newDirection = new Vector2(signedSide,0).rotateAround(new Vector2(), newAngle * signedSide);

                    // console.log(
                    //     `Ball Direction: (Before)`, this.ballDirection, `(After)`, newDirection,`
                    //     Angle: ${MathUtils.RAD2DEG*angle}
                    //     Redirect: ${MathUtils.RAD2DEG*redirection}
                    //     New Angle: ${MathUtils.RAD2DEG*newAngle}`
                    // );

                    this.ballDirection.copy(newDirection);
                }
            } else { // (collisionAxis === 'y')
            }

            // If execution reaches here, we have to perform a bounce.

            // All of the [collision] stuff has properties named .x or .y .
            // They're not even the same properties, but hey, JS is anarchy,
            // and right here it happens to be convenient.
            this.ballPosition[collisionAxis] = this.bounce1D(this.ballPosition[collisionAxis],
                this.level.boardSize[collisionAxis] * (this.ballDirection[collisionAxis] > 0 ? 0.5 : -0.5)
            );
            this.ballDirection[collisionAxis] *= -1;
        }

        if (bounces >= 2) {
            console.warn(
    `Ball bounced ${bounces} times in a single frame, which is unusual.
    Did the game freeze long enough for the ball to travel to multiple borders?`
            );
        }
    }

    scoreup(side) {
        this.scores[side]++;

        this.roundStartSide = side == 0 ? 1 : 0;

        if (this.scores[side] >= this.maxScore) {
            this.close(false);
            return;
        }
        this.newRound();
    }

    pause() {
        this.waitTime = 1;
        if (this.level) {
            this.level.pause(this.waitTime);
        }
    }

    /** @param {boolean} isEndingBecauseCancelled */
    endgame(isEndingBecauseCancelled) {
        if (isEndingBecauseCancelled !== true) {
            let winner = this.scores[0] >= this.maxScore ? 0 : 1;
            alert(`GAME OVER\nLe gagnant est ${this.playerNames[winner]}!`);
        }
    }
}
