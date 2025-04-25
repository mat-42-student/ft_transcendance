import * as THREE from 'three';
import { state } from "../../../../main.js";
import ScoreIndicator from '../../gameplay/ScoreIndicator.js';
import TextMesh from '../../utils/TextMesh.js';
import * as UTILS from "../../../../utils.js";


export default class DebugScoreIndicator extends ScoreIndicator {

	onAdded() {
		this.add(this.#textMesh);
		this.#textMesh.setText('0');
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.visible) {
			this.#colorFlashInterpolator = Math.max(0, this.#colorFlashInterpolator - delta / 3);
			this.#material.color.lerpColors(
				new THREE.Color(0x444444),
				new THREE.Color(0x44ff44),
				this.#colorFlashInterpolator
			);
		}
	}


	scoreChanged(score) {
		super.scoreChanged(score);
		this.#textMesh.setText(String(score));
		this.#colorFlashInterpolator = 1;
	}


	dispose() {
		this.#material.dispose();
	}


	#material = new THREE.MeshBasicMaterial({});
	#textMesh = new TextMesh(this.#material);
	#colorFlashInterpolator = 0.0;

}
