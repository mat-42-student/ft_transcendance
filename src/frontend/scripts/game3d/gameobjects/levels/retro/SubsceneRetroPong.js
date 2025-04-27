import * as THREE from 'three';
import TextMesh from '../../utils/TextMesh.js';
import { state } from '../../../../main.js';
import RetroScoreIndicator from './RetroScoreIndicator.js';
import LevelComputerBase from '../LevelComputerBase.js';
import SubsceneScreensaver from '../idle/SubsceneScreensaver.js';


export default class SubsceneRetroPong extends THREE.Scene {

	/**
	 * @param {LevelComputerBase} parentScene
	 */
	constructor(parentScene) {
		super();
		this.parentScene = parentScene;
	}

	onAdded() {
		this.background = new THREE.Color("#000000");
		this.useScreenCameraAngle();

		this.add(new THREE.AmbientLight("#ff00ff", 1));  // just in case i accidentally have a lit material

		this.whiteMaterial = new THREE.MeshBasicMaterial({color: "#ffffff"});
		this.grayMaterial = new THREE.MeshBasicMaterial({color: "#aaaaaa"});

		this.scoreText = [
			new RetroScoreIndicator(0, this.grayMaterial),
			new RetroScoreIndicator(1, this.grayMaterial)
		];
		this.add(this.scoreText[0]).add(this.scoreText[1]);

		this.namesText = [ new TextMesh(this.grayMaterial), new TextMesh(this.grayMaterial), ];
		this.namesText.forEach((t, i) => {
			this.add(t);
			t.font = state.engine.squareFont;
			t.size = 0.08;
			t.depth = 0;
			t.position.set(i ? 0.5 : -0.5, -0.8, -0.1);
			t.setText(state.gameApp?.playerNames[i] || 'Connecting');
		});
	}

	onFrame(delta, time) {
	}

	namesReady() {
		this.namesText?.forEach((t, i) => {
			t.setText(state.gameApp?.playerNames[i]);
		});
	}

	dispose() {
		if (this.whiteMaterial) this.whiteMaterial.dispose();
		if (this.grayMaterial) this.grayMaterial.dispose();
	}


	//TODO these functions maybe show something different?
	endShowWinner(
		scores = [NaN, NaN],
		winner = NaN,
		playerNames = ['?1', '?2'],
	) {
		this.#endGeneric(scores);
	}
	endShowWebOpponentQuit(opponentName) {
		this.#endGeneric(state.gameApp.side === 0 ? [1, 0] : [0, 1]);
	}
	endShowYouRagequit() {
		this.#endGeneric(state.gameApp.side === 1 ? [1, 0] : [0, 1]);
	}
	endShowNothing = this.endHideResult;
	endHideResult() {
		this.parentScene.setRtScene(new SubsceneScreensaver(this.parentScene));
	}


	#endGeneric(scores) {
		this.scoreText?.forEach((scoreIndicator, i) => {
			// otherwise it automatically hides, because the game is no longer playing
			scoreIndicator.freeze = true;
			scoreIndicator.scoreChanged(scores[i]);
		});
	}


	useScreenCameraAngle() {
		const p = this.parentScene;

		p.views = null;

		p.smoothCamera.position.set(0, 0, 4);
		p.smoothCamera.quaternion.copy(new THREE.Quaternion());
		p.smoothCamera.fov = 30;
		p.smoothCamera.smoothSpeed = 2;
		p.smoothCamera.mousePositionMultiplier.setScalar(0.5);
		p.smoothCamera.mouseRotationMultiplier.setScalar(0.1);
		p.smoothCamera.diagonal = 36.87;  // 4:3 aspect ratio, arbitrarily
	}

}
