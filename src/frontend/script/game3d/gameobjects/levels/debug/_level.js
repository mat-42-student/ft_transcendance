import * as THREE from 'three';
import engine from 'engine';
import LevelBase from '../LevelBase.js';
import DebugBall from './DebugBall.js';
import DebugPaddle from './DebugPaddle.js';


export default class LevelDebug extends LevelBase {
	constructor() {
		super();

		this.boardDiagonal = 30;
		this.ball = new DebugBall();

		const mainCameraAngle = new LevelBase.CameraStats();
		mainCameraAngle.position = new THREE.Vector3(0, 10, 0);

		const deg90AsRad = THREE.MathUtils.degToRad(90);
		mainCameraAngle.quaternion = new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(new THREE.Vector3(1,0,0)),
			-deg90AsRad
		);
		mainCameraAngle.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(0,0,1),
			2*deg90AsRad
		));

		mainCameraAngle.fov = 60;

		this.cameras = [mainCameraAngle, mainCameraAngle, mainCameraAngle];

		engine.clearLevel();
		engine.environmentScene.fog = null;
		engine.environmentScene.background = new THREE.Color('#112211');
	}


	dispose() {
		super.dispose();
	}
}
