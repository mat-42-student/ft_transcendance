import * as THREE from 'three';
import * as UTILS from '../../../utils.js';
import LevelBase from './LevelBase.js';
import SceneOriginHelper from '../utils/SceneOriginHelper.js';
import { state } from '../../../main.js';


export default class LevelIdle extends LevelBase {

	onAdded() {
		super.onAdded();

		this.boardSize = null;
		this.name = 'Idle Level';

		this.background = new THREE.Color("#000000");

		this.views = null;

		this.add(new SceneOriginHelper());

		const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), UTILS.RAD90 / 2);
		const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -UTILS.RAD90 / 3);
		this.smoothCamera.position.set(5, 4, 5);
		this.smoothCamera.quaternion.copy(q1.multiply(q2));
		this.smoothCamera.fov = 39.6;
		this.smoothCamera.smoothSpeed = 10;
		this.smoothCamera.mousePositionMultiplier.setScalar(1);
		this.smoothCamera.mouseRotationMultiplier.setScalar(0.3);
		this.smoothCamera.diagonal = 36.87;  // 4:3 aspect ratio, arbitrarily

		state.engine.gltfLoader.load('/ressources/3d/computerScene.glb', (gltf) => {
			state.engine.scene = window.idleLevel;
			window.idleLevel = undefined;

			this.gltfToDispose = gltf.scene;
			state.engine.scene.add(gltf.scene);
			UTILS.autoMaterial(gltf.scene);  // call again just in case
		});
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);
	}


	dispose() {
		super.dispose();
		UTILS.disposeHierarchy(this.gltfToDispose);
	}

}

