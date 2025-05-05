import * as THREE from 'three';
import TextMesh from "../../utils/TextMesh.js";

export default class DebugPauseText extends TextMesh {

	/**
	 * @param {string} text
	 * @param {number} timeToDisappear
	 */
	constructor(text, timeToDisappear) {
		super(null, null);

		this.size = 0.12;
		this.setText(text);

		this.material = new THREE.MeshBasicMaterial({
			color: '#667766',
			alphaHash: true,
			blendAlpha: 0.5,
		});

		this.interp = 1;
		this.interpRate = Math.max(0.0001, 1 / timeToDisappear);

		this.position.z = 0.5;
		this.rotateY(Math.PI);
	}


	onFrame(delta, time) {
		this.interp -= delta * this.interpRate;
		if (this.interp <= 0) {
			this.removeFromParent();
			return;
		}

		this.scale.setScalar(__curveThing(this.interp));
	}


	dispose() {
		super.dispose();
		this.material.dispose();
	}

}


function __curveThing(n, p = 2.8) {
	// https://www.desmos.com/calculator/xctzvneiwz
	return Math.pow(1 - Math.pow(1 - n, p), 1 / p);
}
