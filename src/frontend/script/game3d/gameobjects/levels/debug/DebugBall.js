import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';


export default class DebugBall extends GAMEOBJECTS.GAMEPLAY.Ball {

	/** @type {GAMEOBJECTS.UTILS.Cross2DHelper} */
	#cross;

	/** @type {THREE.ArrowHelper} */
	#arrow;

	#previousPosition = new THREE.Vector2();


	constructor() {
		super();
	}


	onAdded() {
		this.#cross = new GAMEOBJECTS.UTILS.Cross2DHelper("#33aa33");
		this.#cross.rotateOnAxis(
			new THREE.Vector3(0,1,0),
			THREE.MathUtils.degToRad(45)
		);
		this.#cross.scale.set(0.05, 0.05, 0.05);
		this.add(this.#cross);

		this.#arrow = new THREE.ArrowHelper(
			new THREE.Vector3(0, 1, 0),
			new THREE.Vector3(0,0,0),
			0.05,
			new THREE.Color("#33aa33"),
			0.02,
			0.01,
		)
		this.add(this.#arrow);
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		const currentPosition = new THREE.Vector2(this.position.x, this.position.z);

		if (delta == 0) {  // Divide by zero risk. (Not sure when delta would be 0)
			this.#arrow.visible = false;
		} else {
			const detectedVelocity = new THREE.Vector2().subVectors(
				currentPosition, this.#previousPosition
			).divideScalar(delta);
			const detectedDirection = detectedVelocity.clone().normalize();

			this.#arrow.setDirection(new THREE.Vector3(
				detectedDirection.x, 0, detectedDirection.y
			));
			this.#arrow.visible = detectedVelocity.length() > 0.01;
		}

		this.#previousPosition.copy(currentPosition);
	}


	dispose() {
		this.clear();
		this.#cross = undefined;
		this.#arrow = undefined;
	}
}
