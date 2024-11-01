import * as THREE from 'three';
import Engine from '../Engine.js';
import Entity from '../Entity.js';
import StateInGame from '../states/StateInGame.js';
import EntPaddle from './EntPaddle.js';
import EntBoard from './EntBoard.js';
import EntBall from './EntBall.js';


export default class EntMatch extends Entity {

	#debugUsers = {
		player: undefined,
		adversary: undefined
	};

	#paddles = {
		player: undefined,
		adversary: undefined,
	};

	#board;
	#ball;

	#debugHelpers = {
		grid: undefined,
		grid2: undefined,
		axes: undefined,
	};


	static isLoaded = false;


	constructor(engine) {
		super(engine);
		EntMatch.autoLoad();
	}


	onReady() {
		super.onReady();
		this.#stateCheck();

		engine.scene3.background = new THREE.Color(0,0,0);
		engine.cameraTarget.pos = new THREE.Vector3(0, 0, 5);
		engine.cameraTarget.fov = 50;

		{  // Debug Text
			this.#debugUsers.player = document.createElement("div");
			this.engine.debugOverlay.appendChild(this.#debugUsers.player);
			
			this.#debugUsers.adversary = document.createElement("div");
			this.engine.debugOverlay.appendChild(this.#debugUsers.adversary);
		}

		{  // 3D Debug Helpers
			const GRID_SIZE = 10;  // make this a multiple of 10

			this.#debugHelpers.grid = new THREE.GridHelper(
				GRID_SIZE,GRID_SIZE, "#555555", "#555555"
			);
			this.engine.scene3.add(this.#debugHelpers.grid);
			this.#debugHelpers.grid.rotation.x = THREE.MathUtils.degToRad(90);

			this.#debugHelpers.grid2 = new THREE.GridHelper(
				GRID_SIZE,GRID_SIZE * GRID_SIZE, "#222222", "#222222"
			);
			this.engine.scene3.add(this.#debugHelpers.grid2);
			this.#debugHelpers.grid2.rotation.x = THREE.MathUtils.degToRad(90);
			this.#debugHelpers.grid2.position.z = -0.01; // dont fight the main grid

			this.#debugHelpers.axes = new THREE.AxesHelper(1);
			this.engine.scene3.add(this.#debugHelpers.axes);
			this.#debugHelpers.axes.material.linewidth = 2;
		}

		{  // Paddles
			this.#paddles.player = new EntPaddle(this.engine);
			this.engine.addEntity(this.#paddles.player);
			
			this.#paddles.adversary = new EntPaddle(this.engine);
			this.engine.addEntity(this.#paddles.adversary);
			this.#paddles.adversary.mesh.rotation.y = THREE.MathUtils.degToRad(180);
		}

		{  // The board
			this.#board = new EntBoard(this.engine);
			this.engine.addEntity(this.#board);

			this.#ball = new EntBall(this.engine);
			this.engine.addEntity(this.#ball);
		}
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);
		this.#stateCheck();

		this.#paddles.player.mesh.position.x = -this.engine.state.arenaSize.x/2;
		this.#paddles.adversary.mesh.position.x = this.engine.state.arenaSize.x/2;
		this.#debugHelpers.axes.position.set(
			-(this.engine.state.arenaSize.x / 2 + 0.1),
			-(this.engine.state.arenaSize.y / 2 + 0.1),
			0.5);

		this.#debugUsers.player.innerText = 'Player: ' + engine.state.playerUser;
		this.#debugUsers.adversary.innerText = 'Adversary: ' + engine.state.adversaryUser;

		this.#paddles.player.mesh.position.y = this.engine.state.playerPaddlePosition;
		this.#paddles.adversary.mesh.position.y = this.engine.state.adversaryPaddlePosition;

		this.#ball.mesh.position.x = this.engine.state.ballPosition.x;
		this.#ball.mesh.position.y = this.engine.state.ballPosition.y;
	}


	onDestroy() {
		super.onDestroy();

		this.engine.queueDestroyEntity(this.#paddles.player);
		this.engine.queueDestroyEntity(this.#paddles.adversary);
		this.engine.queueDestroyEntity(this.#board);
		this.engine.queueDestroyEntity(this.#ball);

		this.engine.scene3.remove(this.#debugHelpers.axes);
		this.engine.scene3.remove(this.#debugHelpers.grid);
		this.engine.scene3.remove(this.#debugHelpers.grid2);
		this.#debugHelpers.axes.dispose();
		this.#debugHelpers.grid.dispose();
		this.#debugHelpers.grid2.dispose();
	}


	#stateCheck() {
		if (!(engine.state instanceof StateInGame)) {
			throw Error("Bad state");
		}
	}
}
