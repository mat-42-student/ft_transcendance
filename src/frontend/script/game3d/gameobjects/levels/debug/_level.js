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

		this.cameras = __makeCameraAngles();

		engine.cameraTarget.teleportNow = true;
		engine.cameraTarget.mousePositionMultiplier.set(0.1, 0.1);
		engine.cameraTarget.mouseRotationMultiplier.set(0.1, 0.1);

		// global.game.focusedPlayerIndex = 'neutral';  // Forced camera choice

		engine.level.add(new DebugBoard());
	}


	dispose() {
		super.dispose();

		//TODO
	}
}


function __makeCameraAngles() {
	const neutralCamera = new LevelBase.CameraStats();
	neutralCamera.position = new THREE.Vector3(0, 0.65, -0.4);

	neutralCamera.quaternion = new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3(1,0,0),
		THREE.MathUtils.degToRad(-120)
	);
	neutralCamera.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3(0,0,1),
		THREE.MathUtils.degToRad(180)
	));

	neutralCamera.fov = 55;

	const turn90 = new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3(0, 1, 0),
		global._90,
	);
	const turn180 = new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3(0, 1, 0),
		global._180,
	);

	const p0Camera = neutralCamera.clone();

	p0Camera.position.applyQuaternion(turn90);
	p0Camera.quaternion.applyQuaternion(turn90);

	const p1Camera = p0Camera.clone();
	p1Camera.position.applyQuaternion(turn180);
	p1Camera.quaternion.applyQuaternion(turn180);

	return [p0Camera, p1Camera, neutralCamera];
}
