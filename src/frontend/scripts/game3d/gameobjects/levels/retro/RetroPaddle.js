import * as THREE from 'three';
import { state } from '../../../../main.js';
import Paddle from '../../../gameobjects/gameplay/Paddle.js';
import { LocalGame } from '../../../../apps/LocalGame.js';

export default class RetroPaddle extends Paddle {

	constructor(playerIndex, material) {
		super(playerIndex);
		this.#material = material;
	}

	onAdded() {
		this.#geo = new THREE.BoxGeometry(0.02, 0, 1);
		this.#mesh = new THREE.Mesh(this.#geo, this.#material);
		this.add(this.#mesh);
		this.#mesh.position.x = 0.02;
		if (state.gameApp) {
			const isBotVsBotMatch = state.gameApp.bots != null && state.gameApp.bots.length == 2;
			if (!isBotVsBotMatch)
				this.#setup3dKeyHints();
		}
	}

	onFrame(delta, time) {
		super.onFrame(delta, time);

		this.#keyHintsDisappearTimer = Math.max(0, this.#keyHintsDisappearTimer - delta);

		if (this.visible) {
			this.#mesh.scale.z = state.gameApp.paddleHeights[this.playerIndex];
			this.#update3dKeyHints();
		}
	}

	dispose() {
		if (this.#geo)  this.#geo.dispose();
	}

	#setup3dKeyHints() {
		const shouldAlwaysShowMyHint = state.gameApp.side == 2;
		const amIThePlayer = state.gameApp.side == this.playerIndex;
		if (!(shouldAlwaysShowMyHint || amIThePlayer))
			return;

		this.#keyHintUp = state.gameApp.level.keysModels?.[this.playerIndex ? "key_up" : "key_w"];
		this.#keyHintDown = state.gameApp.level.keysModels?.[this.playerIndex ? "key_down" : "key_s"];
		if (this.#keyHintUp == null || this.#keyHintDown == null) {
			// give up just in case, the game runs fine without hints
			this.#keyHintUp = this.#keyHintDown = null;
			return;
		}
		this.add(this.#keyHintUp).add(this.#keyHintDown);

		if (this.playerIndex == 1) {
			this.#keyHintUp.rotateY(Math.PI);
			this.#keyHintDown.rotateY(Math.PI);
		}

		const tiltZ = THREE.MathUtils.degToRad(10) * (this.playerIndex ? 1 : -1);
		this.#keyHintUp.rotateZ(tiltZ);
		this.#keyHintDown.rotateZ(tiltZ);

		const tiltX = -Math.PI / 8;
		this.#keyHintUp.rotateX(tiltX);
		this.#keyHintDown.rotateX(tiltX);
	}

	#update3dKeyHints() {
		// give up just in case, the game runs fine without hints
		if (this.#keyHintUp == null || this.#keyHintDown == null)
			return;

		if (this.#keyHintsDisappearTimer <= 0) {
			this.#keyHintUp.visible = this.#keyHintDown.visible = false;
			return;
		}

		this.#keyHintUp.position.z = 0.1;
		this.#keyHintDown.position.z = -this.#keyHintUp.position.z;

		this.#keyHintUp.position.x = 0.1;
		this.#keyHintDown.position.x = 0.1;

		if (this.playerIndex == 1) {
			// the paddle is automatically rotated because i thought that was a good idea
			this.#keyHintUp.position.z *= -1;
			this.#keyHintDown.position.z *= -1;
		}

		const inputDirection = state.input.getPaddleInput(this.playerIndex);

		const s_all = this.#keyHintsDisappearTimer > 1 ? 1 : this.#keyHintsDisappearTimer;
		const s_up = (inputDirection == 1 ? 0.3 : 0.5) * s_all;
		const s_down = (inputDirection == -1 ? 0.3 : 0.5) * s_all;
		// i have NO idea why, but the S is inverted. This is why the X component is -1.
		this.#keyHintUp.scale.set(-s_up, s_up, s_up);
		this.#keyHintDown.scale.set(-s_down, s_down, s_down);
	}

	/** @type {THREE.Mesh} */
	#mesh;
	#geo;
	#material;

	#keyHintUp;
	#keyHintDown;
	#keyHintsDisappearTimer = 10;

}
