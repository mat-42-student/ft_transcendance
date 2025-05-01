import * as THREE from 'three';
import { state } from '../../../../main.js';
import TextMesh from '../../utils/TextMesh.js';


export default class RetroTimer extends THREE.Object3D {

	constructor(material, computer) {
		super();
		this.#material = material;
		this.computer = computer;
	}

	onAdded() {
		this.#textMesh = new TextMesh(this.#material);
		this.#textMesh.font = state.engine.squareFont;
		this.#textMesh.size = 0.25;
		this.#textMesh.depth = 0;
		this.add(this.#textMesh);
	}

	onFrame(delta, time) {
		this.#timeout = Math.max(0, this.#timeout - delta);
		this.visible = this.#timeout > 0;

		if (this.visible) {
			this.#textMesh.visible = this.#blinkme ? this.computer.getBlink() : true;
			if (this.#isCountingDown)
				this.#textMesh.setText(`${this.#timeout.toFixed(1)}`);
		}
	}

	setWait(time) {
		this.#timeout = time;
		this.#blinkme = false;
		this.#isCountingDown = true;
	}

	setGo() {
		this.#timeout = 0.5;
		this.#blinkme = true;
		this.#isCountingDown = false;
		this.#textMesh.setText('GO!');
	}

	setCancel() {
		this.#timeout = 0;
		this.#isCountingDown = false;
	}

	#material;
	#textMesh;
	#timeout = 0;
	#isCountingDown = false;
	#blinkme = false;

}
