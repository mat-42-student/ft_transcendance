import * as THREE from 'three';
import engine from 'engine';
import global from 'global';
import LevelBase from '../LevelBase.js';


export default class LevelTest extends LevelBase {
	constructor() {
		super();

		throw "TODO: wip"

		engine.clearLevel();
		engine.environmentScene.fog = null;
		engine.environmentScene.background = new THREE.Color('#112211');

		this.boardDiagonal = 30;
		// const ball = new DebugBall();
		// engine.level.add(ball);

		// engine.level.add(new DebugPaddle(0));
		// engine.level.add(new DebugPaddle(1));

		// engine.level.add(new DebugScoreIndicator(0));
		// engine.level.add(new DebugScoreIndicator(1));

		// engine.cameraTarget.diagonal = 40;
		// this.cameras = __makeCameraAngles();

		// engine.cameraTarget.teleportNow = true;
		// engine.cameraTarget.mousePositionMultiplier.set(0.1, 0.1);
		// engine.cameraTarget.mouseRotationMultiplier.set(0.1, 0.1);
		// engine.cameraTarget.smoothSpeed = 15;

		// // global.game.focusedPlayerIndex = 'neutral';  // Forced camera choice

		// engine.level.add(new DebugBoard());
	}


	dispose() {
		super.dispose();

		//TODO
	}
}


function __makeCameraAngles() {
	// const neutralCamera = new LevelBase.CameraStats();
	// neutralCamera.position = new THREE.Vector3(0, 0.65, -0.4);
	// neutralCamera.quaternion = __lookDownQuaternion(180, 60);
	// neutralCamera.fov = 60;

	// const p0Camera = new LevelBase.CameraStats();
	// p0Camera.position = new THREE.Vector3(0.6, 0.45, 0);
	// p0Camera.quaternion = __lookDownQuaternion(90, 45);
	// p0Camera.fov = 55;

	// const p1Camera = new LevelBase.CameraStats();
	// p1Camera.position.copy(p0Camera.position).x *= -1;
	// p1Camera.quaternion = __lookDownQuaternion(-90, 45);
	// p1Camera.fov = p0Camera.fov;

	return [p0Camera, p1Camera, neutralCamera];
}
