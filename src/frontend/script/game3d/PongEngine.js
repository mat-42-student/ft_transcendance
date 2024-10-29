import * as THREE from 'three';
import Engine from './Engine.js'


export default class PongEngine extends Engine {
	playerUser = "(uninitialized player name)";
	playerPaddleSize = 0.5;
	playerPaddlePosition = 0.5;
	playerScore = 4;

	adversaryUser = "(uninitialized adversary name)";
	adversaryPaddleSize = 0.7;
	adversaryPaddlePosition = -0.2;
	adversaryScore = 2;

	ballPosition = {'x': 0, 'y': 0};
	arenaSize = {'x': 2, 'y': 1};


	constructor() {
		super({
			antialias: true,
		});
	}


	connectedCallback() {
		super.connectedCallback();

		this.scene3.background = new THREE.Color(0.1,0.1,0.1);
		throw "//TODO";
	}

	disconnectedCallback() {
		console.log('Disconnected Callback');
		super.disconnectedCallback();
	}

	// MARK: #Private
}
