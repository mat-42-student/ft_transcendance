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

		this.background = new THREE.Color("#606060");

		this.views = null;

		this.add(new SceneOriginHelper());
		this.add(new THREE.AmbientLight( 0xffffff, 0.8 ));
		this.add(new THREE.DirectionalLight( 0xffffff, 0.8 ));

		const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -UTILS.RAD90);
		const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), 2*UTILS.RAD90);
		this.smoothCamera.position.set(0, 1, 0);
		this.smoothCamera.quaternion.copy(q1.multiply(q2));
		this.smoothCamera.fov = 120;
		this.smoothCamera.smoothSpeed = 1;
		this.smoothCamera.mousePositionMultiplier.setScalar(0.02);
		this.smoothCamera.mouseRotationMultiplier.setScalar(0.02);

		state.engine.gltfLoader.load('/ressources/3d/test.glb', (gltf) => {
			state.engine.scene = window.idleLevel;
			window.idleLevel = undefined;
			state.engine.scene.funnycube = gltf.scene;
			state.engine.scene.funnycube.scale.setScalar(0.2);
			state.engine.scene.add(state.engine.scene.funnycube);
			UTILS.autoMaterial(state.engine.scene);  // call again just in case
		});
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.funnycube) {
			this.funnycube.rotateY(delta * 0.2);
			this.funnycube.rotateX(delta * 0.3)
		}
	}


	dispose() {
		super.dispose();
		UTILS.disposeHierarchy(this.funnycube);
	}

}

