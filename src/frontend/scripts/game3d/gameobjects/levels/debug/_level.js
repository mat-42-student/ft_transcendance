import * as THREE from 'three';
import engine from 'engine';
import LevelBase from '../LevelBase.js';
import DebugBall from './DebugBall.js';
import DebugPaddle from './DebugPaddle.js';
import DebugBoard from './DebugBoard.js';
import * as UTILS from '../../../../utils.js';
import DebugScoreIndicator from './DebugScoreIndicator.js';


export default class LevelDebug extends LevelBase {
	constructor() {
		super();

		this.size = new THREE.Vector2(1.5, 1);

		engine.clearLevel();
		engine.environmentScene.fog = null;
		engine.environmentScene.background = new THREE.Color('#112211');

		const ball = new DebugBall();
		engine.level.add(ball);

		engine.level.add(new DebugPaddle(0));
		engine.level.add(new DebugPaddle(1));

		engine.level.add(new DebugScoreIndicator(0));
		engine.level.add(new DebugScoreIndicator(1));

		engine.cameraTarget.diagonal = 40;
		this.cameras = __makeCameraAngles();

		engine.cameraTarget.teleportNow = true;
		engine.cameraTarget.mousePositionMultiplier.set(0.1, 0.1);
		engine.cameraTarget.mouseRotationMultiplier.set(0.1, 0.1);
		engine.cameraTarget.smoothSpeed = 15;

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
	neutralCamera.quaternion = UTILS.makeLookDownQuaternion(180, 60);
	neutralCamera.fov = 60;

	const p0Camera = new LevelBase.CameraStats();
	p0Camera.position = new THREE.Vector3(0.6, 0.45, 0);
	p0Camera.quaternion = UTILS.makeLookDownQuaternion(90, 45);
	p0Camera.fov = 55;

	const p1Camera = new LevelBase.CameraStats();
	p1Camera.position.copy(p0Camera.position).x *= -1;
	p1Camera.quaternion = UTILS.makeLookDownQuaternion(-90, 45);
	p1Camera.fov = p0Camera.fov;

	return [p0Camera, p1Camera, neutralCamera];
}
