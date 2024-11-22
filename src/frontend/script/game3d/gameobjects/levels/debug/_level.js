import * as THREE from 'three';
import engine from 'engine';
import LevelBase from '../LevelBase.js';
import DebugBall from './DebugBall.js';
import DebugPaddle from './DebugPaddle.js';
import DebugBoard from './DebugBoard.js';
import global from 'global';
import DebugScoreIndicator from './DebugScoreIndicator.js';


export default class LevelDebug extends LevelBase {
	constructor() {
		super();

		engine.clearLevel();
		engine.environmentScene.fog = null;
		engine.environmentScene.background = new THREE.Color('#112211');

		this.boardDiagonal = 30;
		const ball = new DebugBall();
		engine.level.add(ball);

		engine.level.add(new DebugPaddle(0));
		engine.level.add(new DebugPaddle(1));

		engine.level.add(new DebugScoreIndicator(0));
		engine.level.add(new DebugScoreIndicator(1));

		const mainCameraAngle = new LevelBase.CameraStats();
		mainCameraAngle.position = new THREE.Vector3(0, 0.65, -0.4);

		mainCameraAngle.quaternion = new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(1,0,0),
			THREE.MathUtils.degToRad(-120)
		);
		mainCameraAngle.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(0,0,1),
			THREE.MathUtils.degToRad(180)
		));

		mainCameraAngle.fov = 55;

		engine.cameraTarget.teleportNow = true;
		engine.cameraTarget.mousePositionMultiplier.set(0.1, 0.1);
		engine.cameraTarget.mouseRotationMultiplier.set(0.1, 0.1);

		global.game.focusedPlayerIndex = 'neutral';

		this.cameras = [mainCameraAngle, mainCameraAngle, mainCameraAngle];
		engine.level.add(new DebugBoard());
	}


	dispose() {
		super.dispose();

		//TODO
	}
}
