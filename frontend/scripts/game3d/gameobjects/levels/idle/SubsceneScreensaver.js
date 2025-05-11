import * as THREE from 'three';
import TextMesh from '../../utils/TextMesh.js';
import LevelComputerBase from '../LevelComputerBase.js';

export default class SubsceneScreensaver extends THREE.Scene {

	/**
	 * @param {LevelComputerBase} parentScene
	 */
	constructor(parentScene) {
		super();
		this.parentScene = parentScene;
	}

	onAdded() {
		this.parentScene.useDefaultCameraAngle();

		this.parentScene.rtCamera.position.set(0, -0.6, 0);
		this.parentScene.rtCamera.rotation.copy(new THREE.Euler());
		this.parentScene.rtCamera.rotateX(Math.PI / 2);
		this.parentScene.rtCamera.rotateZ(Math.PI);
		this.parentScene.rtCamera.fov = 90;
		this.parentScene.rtCamera.updateProjectionMatrix();

		this.background = new THREE.Color("#000000");
		this.add(new THREE.AmbientLight("#ffffff", 0.2));
		const sun = new THREE.DirectionalLight("#ffffff", 1.8);
		this.add(sun);
		sun.position.set(-0.2, -1, 0.2);  // this turns the light
		this.screensaverTextMaterial = new THREE.MeshStandardMaterial({
			color: "#33dd55",
			roughness: 1,
		});
		this.screensaverText = new TextMesh(this.screensaverTextMaterial, null, true, true);
		this.screensaverText.depth = 0.04;
		this.screensaverText.setText("Transcendance");
		this.screensaverText.scale.setScalar(1.2);
		this.screensaverText.rotateX(-Math.PI/2);
		this.screensaverText.rotateZ(Math.PI);
		this.add(this.screensaverText);
	}

	onFrame(delta, time) {
		if (this.#screensaver.direction == 1 && this.#screensaver.pos >= 1)
			this.#screensaver.direction = -1;
		else if (this.#screensaver.direction == -1 && this.#screensaver.pos <= -1)
			this.#screensaver.direction = 1;

		this.#screensaver.pos += delta * 0.3 * this.#screensaver.direction;
		this.#screensaver.pos = THREE.MathUtils.clamp(this.#screensaver.pos, -1, 1);
		this.#screensaver.turn += delta * 0.7;

		this.screensaverText.position.x = 0.5 * this.#screensaver.pos;
		this.screensaverText.rotation.y = this.#screensaver.turn;
	}

	dispose() {
		if (this.screensaverTextMaterial) this.screensaverTextMaterial.dispose();
	}


	#screensaver = {
		direction: 1,
		pos: 0,
		turn: 0,
	};

}
