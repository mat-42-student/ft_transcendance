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

			{  // Screen render target
				const screenMaterial = UTILS.findMaterialInHierarchy(gltf.scene, "Screen");
				if (!(screenMaterial instanceof THREE.MeshStandardMaterial))  throw Error("screen't");

				this.rt = new THREE.WebGLRenderTarget(160, 120);

				this.rtCamera = new THREE.PerspectiveCamera(90, this.rt.width/this.rt.height);
				this.rtCamera.position.set(0, 0, 1);

				this.rtScene = new THREE.Scene();
				this.rtScene.background = new THREE.Color("#000000");
				this.rtScene.add(new THREE.AmbientLight("#ffffff", 1));  // just in case a material is shaded
				this.rtScene.add(new THREE.AxesHelper(1));
				this.rtScene.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 12, 48)));

				screenMaterial.roughness = 0;
				screenMaterial.emissive = new THREE.Color("#ffffff");  //THIS IS NEEDED: it multiplies emissiveMap.
				screenMaterial.emissiveMap = this.rt.texture;
				screenMaterial.emissiveIntensity = 1;
			}  // Screen render target

			UTILS.autoMaterial(gltf.scene);  // call again just in case
		});
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.rtScene) {
			const prevTarget = state.engine.renderer.getRenderTarget();

			try {
				state.engine.renderer.setRenderTarget(this.rt);
				state.engine.renderer.render(this.rtScene, this.rtCamera);
			} catch (error) {
				console.error("Computer is being silly:", error);
			}

			state.engine.renderer.setRenderTarget(prevTarget);
		}
	}


	dispose() {
		super.dispose();
		UTILS.disposeHierarchy(this.gltfToDispose);
		if (this.rt)  this.rt.dispose();
		if (this.rtScene)  UTILS.disposeHierarchy(this.rtScene);
	}

}

