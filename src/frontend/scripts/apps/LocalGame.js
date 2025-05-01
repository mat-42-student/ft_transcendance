import { chooseHeader, state } from "../main.js";
import * as UTILS from "../utils.js";
import {MathUtils, Vector2} from 'three';
import * as LEVELS from '../game3d/gameobjects/levels/levels.js';
import { GameBase } from "./GameBase.js";
import LevelBase from "../game3d/gameobjects/levels/LevelBase.js";


// Controls how the game runs.
// Should be (manually) kept in sync with game/const.py
const STATS = JSON.parse(`
{
    "initialPadSize": 0.2,
    "initialPadSpeed": 0.2,
    "padShrinkFactor": 0.95,
    "padAccelerateFactor": 1.1,

    "initialBallSpeed": 0.4,
    "ballAccelerateFactor": 1.1,
    "redirectionFactor": 1.5,
    "maxAngleDeg": 45.0,

    "maxScore": 5
}
`);

// 0: perfect accuracy
// 1: use the whole paddle (might miss)
// >1: allow missing
const DEFAULT_CPU_INACCURACY = 1.5;
window.CPU_INACCURACY = DEFAULT_CPU_INACCURACY;


export class LocalGame extends GameBase {

    constructor (isCPU = false, sisyphus = false) {
        super();

        this.isCPU = isCPU;
        sisyphus = this.sisyphus = isCPU && sisyphus;
        this.bots = [];
        if (sisyphus)
            this.bots.push(new Cpu(0, this));
        if (isCPU)
            this.bots.push(new Cpu(1, this));

        this.waitTime = 0;

        // game simulation stats - might want to keep these numbers synced with web game
        this.ballSpeed = STATS.initialBallSpeed;
        this.paddleSpeeds = [STATS.initialPadSpeed, STATS.initialPadSpeed];
        this.paddleHeights = [STATS.initialPadSize, STATS.initialPadSize];
        this.maxScore = STATS.maxScore;

        if (sisyphus) {
            window.CPU_INACCURACY = 0.1;
            this.ballSpeed *= 5;
            this.paddleSpeeds[0] = this.paddleSpeeds[1] *= 5;
            this.paddleHeights[0] = this.paddleHeights[1] = 0.1;
            this.maxScore = 1;
        } else {
            window.CPU_INACCURACY = DEFAULT_CPU_INACCURACY;
        }

        this.roundStartSide = Math.random() > 0.5 ? 1 : 0;

        this.playerNames[0] = sisyphus ? this.generateRandomNick() : 'Player 1';
        this.playerNames[1] = isCPU ? this.generateRandomNick() : 'Player 2';

        this.side = isCPU ? 0 : 2;  // Neutral (2) if keyboard PVP

        /** @type {LevelBase} */
        this.level = new (LEVELS.pickRandomLevel())();  // randomly select class, then construct it

    }

    startLocalGame() {
        chooseHeader('ingame');
        this.pause(3);
        this.recenter();
    }

	frame(delta, time) {
        try {
            this.waitTime = Math.max(0, this.waitTime - delta);

            if (this.waitTime <= 0 && document.hasFocus()) {
                if (this.level)  this.level.unpause();

                for (const bot of this.bots) {
                    bot.frame(delta);
                }

                this.movePaddles(delta);
                this.moveBall(delta);
            }

            super.frame(delta, time);
        } catch (error) {
            console.error("Local game error, exiting:", error);
            this.close();
        }
	}

    close(youCancelled) {
        if (youCancelled) {
            this.level.endShowNothing();
        } else {
            this.level.endShowWinner(
                [...this.scores],
                this.scores[0] >= this.maxScore ? 0 : 1,
                [...this.playerNames]
            );
        }

        super.close(youCancelled);
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
        for (const bot of this.bots) {
            bot.decideCountdown = 0.01;
        }
    }


    newRound() {
        this.recenter();

        this.paddleHeights[1] = this.paddleHeights[0] *= STATS.padShrinkFactor;

        this.ballSpeed *= STATS.ballAccelerateFactor;
        this.paddleSpeeds[1] = this.paddleSpeeds[0] *= STATS.padAccelerateFactor;

        this.pause();
    }

    movePaddles(delta) {
        const inputs = [
            state.input.getPaddleInput(0),
            state.input.getPaddleInput(1)
        ];
        for (const bot of this.bots) {
            inputs[bot.side] = bot.moveDirection * (bot.moveCountdown > 0 ? 1 : 0);
            bot.moveCountdown = Math.max(0, bot.moveCountdown - delta);
        }

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
                // console.error(`Bounced ${bounces} times in a single frame, game appears to be lagging.`);
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

                    for (const bot of this.bots) {
                        bot.decideCountdown = 0.01;
                    }

                    const signedSide = collisionSide == 0 ? 1 : -1;

                    const hitPosition = UTILS.map(this.ballPosition.y,
                        this.paddlePositions[collisionSide] - pHeight,
                        this.paddlePositions[collisionSide] + pHeight,
                        -1,
                        1
                    );

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

    //     if (bounces >= 2) {
    //         console.warn(
    // `Ball bounced ${bounces} times in a single frame, which is unusual.
    // Did the game freeze long enough for the ball to travel to multiple borders?`
    //         );
    //     }
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

    pause(time = 1) {
        this.waitTime = time;
        if (this.level) {
            this.level.pause(time);
        }
    }

}


class Cpu {

    /**
     * @param {0 | 1} side
     * @param {LocalGame} game
     */
    constructor(side, game) {
        this.side = side;
        this.game = game;

        this.moveDirection = 0;
        this.moveCountdown = 0;
        this.decideCountdown = NaN;
    }

    frame(delta) {
        if (this.decideCountdown <= 0)
            this.#decide();
        if (this.decideCountdown != NaN)
            this.decideCountdown = Math.max(0, this.decideCountdown - delta);
    }

    #decide() {
        this.decideCountdown = NaN;
        if ((this.side == 0 && this.game.ballDirection.x > 0)
            || (this.side == 1 && this.game.ballDirection.x < 0))
            this.#findTarget();
        else
            this.#startMove(0);
    }

    #findTarget() {
        // This function is a port of https://www.desmos.com/calculator/revv9si2to

        let a = this.game.ballPosition.clone();
        let b = this.game.ballPosition.clone().add(this.game.ballDirection);

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

        let wallX = (this.game.level.boardSize.x / 2) * (this.side == 0 ? 1 : -1);
        let target = triangleWave(wallX);

        const randomizer = window.CPU_INACCURACY
            * (this.game.paddleHeights[this.side] / 2)
            * (Math.random() * 2 - 1);
        target += randomizer;

        this.#startMove(target);
    }

    #startMove(destination) {
        const neededMovement = destination - this.game.paddlePositions[this.side];
        this.moveDirection = Math.sign(neededMovement);
        if (this.game.paddleSpeeds[this.side] > 0)
            this.moveCountdown = Math.abs(neededMovement / this.game.paddleSpeeds[this.side]);
        else  // just protecting against divide by 0
            this.moveCountdown = 0;
    }

}
