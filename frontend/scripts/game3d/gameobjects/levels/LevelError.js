import * as THREE from 'three';
import * as UTILS from '../../../utils.js';
import LevelBase from './LevelBase.js';
import { state } from '../../../main.js';


export default class LevelError extends LevelBase {

	onAdded() {
		super.onAdded();

		this.boardSize = null;
		this.name = 'Error Level';

		this.background = new THREE.Color("#cc2222");

		this.views = null;

		this.add(new THREE.AmbientLight( 0xffffff, 0.8 ));
		this.add(new THREE.DirectionalLight( 0xffffff, 0.8 ));

		const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -UTILS.RAD90);
		const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), 2*UTILS.RAD90);
		this.smoothCamera.position.set(0, 0, 0);
		this.smoothCamera.quaternion.copy(q1.multiply(q2));
		this.smoothCamera.fov = 120;
		this.smoothCamera.smoothSpeed = 0.5;
		this.smoothCamera.mousePositionMultiplier.setScalar(0);
		this.smoothCamera.mouseRotationMultiplier.setScalar(0.3);

		state.engine.gltfLoader.load('/ressources/3d/errorScene.glb', (gltf) => {
			state.engine.scene = state.engine.errorScene;
			state.engine.errorScene = null;
			state.engine.scene.gltf = gltf.scene;
			state.engine.scene.add(gltf.scene);
			UTILS.autoMaterial(state.engine.scene);  // call again just in case
		});
	}


	dispose() {
		super.dispose();
		if (state.engine.errorScene) {
			state.engine.errorScene = null;
		}
		UTILS.disposeHierarchy(this.gltf);
	}

}
