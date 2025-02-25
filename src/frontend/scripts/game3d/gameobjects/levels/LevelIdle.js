import * as THREE from 'three';
import * as UTILS from '../../../utils.js';
import { state } from '../../../main.js';
import LevelBase from './LevelBase.js';
import SceneOriginHelper from '../utils/SceneOriginHelper.js';


export default class LevelIdle extends LevelBase {

	constructor() {
		super();

		this.boardSize = null;
		this.name = 'Idle Level';

		this.background = new THREE.Color("#8080a0");

		this.views = null;
		const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -UTILS.RAD90);
		const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), 2*UTILS.RAD90);
		this.smoothCamera.position.set(1, 3, 1);
		this.smoothCamera.quaternion.copy(q1.multiply(q2));
		this.smoothCamera.fov = 60;
		this.smoothCamera.smoothSpeed = 1;
	}


	onAdded() {
		this.add(new SceneOriginHelper());
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

