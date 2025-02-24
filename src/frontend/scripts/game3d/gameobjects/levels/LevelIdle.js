import * as THREE from 'three';
import { state } from '../../../main.js';
import LevelBase from './LevelBase.js';
import SceneOriginHelper from '../utils/SceneOriginHelper.js';


export default class LevelIdle extends LevelBase {

	constructor() {
		super();

		this.size = null;
		this.name = 'Idle World Scene';

		this.background = new THREE.Color("#000050");
		state.engine.cameraTarget.position.y = 1.42535353443;
		state.engine.cameraTarget.smoothSpeed = 1;

		const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -UTILS.RAD90);
		const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), 2*UTILS.RAD90);
		this.cameras[0] = new LevelBase.CameraStats();
		this.cameras[0].position = new THREE.Vector3(1, 3, 1);
		this.cameras[0].quaternion = q1.multiply(q2);
		this.cameras[0].fov = 60;
		this.cameras[2] = this.cameras[1] = this.cameras[0];

		const thing3d = new SceneOriginHelper();
		thing3d.name = "Scene origin helper";
		engine.environmentScene.add(thing3d);
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);
	}


	dispose() {
		super.dispose();
		console.error('LevelIdle.dispose() is never supposed to execute.\n',
			'This scene is meant to never be deleted or replaced.'
		);
	}
}

