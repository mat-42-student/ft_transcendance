import * as THREE from 'three';
import TextMesh from '../../utils/TextMesh.js';
import { state } from '../../../../main.js';
import RetroScoreIndicator from './RetroScoreIndicator.js';
import LevelComputerBase from '../LevelComputerBase.js';
import SubsceneScreensaver from '../idle/SubsceneScreensaver.js';
import RetroBall from './RetroBall.js';
import RetroPaddle from './RetroPaddle.js';
import RetroTimer from './RetroTimer.js';


export default class SubsceneRetroPong extends THREE.Scene {

	#blinkTimer = 0;
	#lowFPSTimer = 0;
	#disconnectAnimFrame = 0;

	/**
	 * @param {LevelComputerBase} parentScene
	 */
	constructor(parentScene) {
		super();
		this.parentScene = parentScene;
	}

	onAdded() {
		this.background = new THREE.Color("#000000");
		this.parentScene.useScreenCameraAngle();

		this.parentScene.rtCamera.position.set(0, -5, 0);
		this.parentScene.rtCamera.rotation.copy(new THREE.Euler());
		this.parentScene.rtCamera.rotateX(Math.PI / 2);
		this.parentScene.rtCamera.rotateZ(Math.PI);
		this.parentScene.rtCamera.fov = 15;
		this.parentScene.rtCamera.updateProjectionMatrix();

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
			t.size = 0.03;
			t.depth = 0;
			t.position.set(i ? -0.333 : 0.333, 0.01, -0.4);
			t.rotateX(-Math.PI/2);
			t.rotateZ(Math.PI);
			t.setText(state.gameApp?.playerNames[i] || 'Connecting');
		});

		this.add(new RetroBall(this.whiteMaterial, this));
		this.add(new RetroPaddle(0, this.whiteMaterial));
		this.add(new RetroPaddle(1, this.whiteMaterial));

		this.parentScene.retroBoardModel.children[0].material = this.grayMaterial;
		this.add(this.parentScene.retroBoardModel);
		this.parentScene.retroBoardModel.position.y = 0.01;

		this.timerIndicator = new RetroTimer(this.whiteMaterial, this);
		this.add(this.timerIndicator);
		this.timerIndicator.position.y = 0.005;
		this.timerIndicator.position.z = 0.1;
		this.timerIndicator.rotateX(Math.PI/2);
		this.timerIndicator.rotateY(Math.PI);
	}

	onFrame(delta, time) {
		this.#blinkTimer = (this.#blinkTimer + delta) % 1.0;
		this.#lowFPSTimer += delta;
		if (this.#lowFPSTimer > 0.1) {
			this.#disconnectAnimFrame = (this.#disconnectAnimFrame + 1) % (5 * 4);
			this.trophy?.rotateY(this.#lowFPSTimer * Math.PI / 2);
			this.disconnect?.forEach((obj, i) => {
				const animation = [0, 1, 2, 2];
				const offset = animation[Math.floor(this.#disconnectAnimFrame / 5) % animation.length];
				obj.position.z = (i ? -1 : 1) * offset;
			});
			// before the next line, this.#lowFPSTimer acts as a delta value.
			this.#lowFPSTimer = 0;
		}
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


	endShowWinner(
		scores = [NaN, NaN],
		winner = NaN,
		playerNames = ['?1', '?2'],
	) {
		this.#endGeneric(scores);
	}
	endShowWebOpponentQuit(opponentName) {
		this.#endShowDisconnect(state.gameApp.side ? 1 : -1);
		this.#endGeneric(state.gameApp.side === 0 ? [1, 0] : [0, 1]);
	}
	endShowYouRagequit() {
		this.#endShowDisconnect(state.gameApp.side ? -1 : 1);
		this.#endGeneric(state.gameApp.side === 1 ? [1, 0] : [0, 1]);
	}
	endShowNothing = this.endHideResult;
	endHideResult() {
		this.parentScene.setRtScene(new SubsceneScreensaver(this.parentScene));
	}

	getBlink() {
		return Math.floor(this.#blinkTimer * 10) % 2 == 0;
	}


	#endShowDisconnect(sideMult) {
		this.#disconnectAnimFrame = 0;
		this.disconnect = [...this.parentScene.disconnectModels];
		this.disconnectCenter = new THREE.Group();
		this.add(this.disconnectCenter);
		this.disconnectCenter.add(this.disconnect[0]).add(this.disconnect[1]);
		this.disconnectCenter.scale.setScalar(0.04);
		this.disconnectCenter.rotateY(-Math.PI/4);
		this.disconnectCenter.position.set(sideMult * 0.333, 0, 0);
	}
	#endGeneric(scores) {
		this.scoreText?.forEach((scoreIndicator, i) => {
			// otherwise it automatically hides, because the game is no longer playing
			scoreIndicator.freeze = true;
			scoreIndicator.scoreChanged(scores[i]);
		});

		this.trophy = this.parentScene.trophyModel;
		this.add(this.trophy);
		this.trophy.position.set(scores[0] > scores[1] ? 0.333 : -0.333, 0, -0.1);
		this.trophy.rotateX(Math.PI / 2);
	}

}
