import * as THREE from 'three';
import engine from 'engine';
import LevelBase from '../LevelBase.js';
import DebugBall from './DebugBall.js';
import DebugPaddle from './DebugPaddle.js';
import DebugBoard from './DebugBoard.js';
import global from 'global';


export default class LevelDebug extends LevelBase {
	constructor() {
		super();

		engine.clearLevel();
		engine.environmentScene.fog = null;
		engine.environmentScene.background = new THREE.Color('#112211');
		engine.cameraTarget.teleportNow = true;

		this.boardDiagonal = 30;
		const ball = new DebugBall();
		engine.level.add(ball);

		engine.level.add(new DebugPaddle(0));
		engine.level.add(new DebugPaddle(1));

		const mainCameraAngle = new LevelBase.CameraStats();
		mainCameraAngle.position = new THREE.Vector3(0, 0.45, -0.3);

		mainCameraAngle.quaternion = new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(1,0,0),
			THREE.MathUtils.degToRad(-120)
		);
		mainCameraAngle.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(0,0,1),
			THREE.MathUtils.degToRad(180)
		));

		mainCameraAngle.fov = 65;

		global.game.focusedPlayerIndex = 'neutral';

		this.cameras = [mainCameraAngle, mainCameraAngle, mainCameraAngle];
		engine.level.add(new DebugBoard());
	}


	dispose() {
		super.dispose();
	}
}
