import * as THREE from 'three';
import StateBase from "./StateBase.js";
import Engine from '../Engine.js';
import EntMatch from '../entities/EntMatch.js';


export default class StateInGame extends StateBase {
	playerPaddleSize = 0.5;
	playerPaddlePosition = 0.5;
	playerScore = 4;

	adversaryUser = "(UNINITIALIZED ADVERSARY NAME)";
	adversaryPaddleSize = 0.7;
	adversaryPaddlePosition = -0.2;
	adversaryScore = 2;

	ballPosition = {'x': 0, 'y': 0};
	arenaSize = {'x': 2, 'y': 1};

	#level;  get level() { return this.#level; }
	#match;


	constructor(newLevel) {
		super();
		this.#level = newLevel;
	}


	/** @param {Engine} engine */
	enterState(engine) {
		this.#match = new EntMatch(engine);
		engine.addEntity(this.#match);
	}


	/** @param {Engine} engine */
	exitState(engine) {
		engine.queueDestroyEntity(this.#match);
	}
}
