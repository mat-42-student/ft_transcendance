import StateBase from "./StateBase.js";


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

	constructor() {
		super();
	}


	/** @param {Engine} engine */
	enterState(engine) {

		//TODO
	}


	/** @param {Engine} engine */
	exitState(engine) {
		//TODO
	}
}