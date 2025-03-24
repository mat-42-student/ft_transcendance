import * as THREE from 'three';
import * as UTILS from '../../../utils.js';
import LevelBase from './LevelBase.js';
import SceneOriginHelper from '../utils/SceneOriginHelper.js';


export default class LevelIdle extends LevelBase {

	constructor() {
		super();

		this.boardSize = null;
		this.name = 'Idle Level';

		this.background = new THREE.Color("#ffffff");

		this.views = null;
	}


	onAdded() {
		super.onAdded();

		this.add(new SceneOriginHelper());

		const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -UTILS.RAD90);
		const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), 2*UTILS.RAD90);
		this.smoothCamera.position.set(0, 1, 0);
		this.smoothCamera.quaternion.copy(q1.multiply(q2));
		this.smoothCamera.fov = 120;
		// this.smoothCamera.smoothSpeed = 1;
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);
	}


	dispose() {
		super.dispose();
	}

}

