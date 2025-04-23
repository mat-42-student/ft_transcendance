import * as THREE from 'three';
import * as UTILS from '../../../utils.js';
import LevelBase from './LevelBase.js';
import { state } from '../../../main.js';


export default class LevelComputerBase extends LevelBase {

	constructor(subsceneClass) {
		super();
		this.subsceneClass = subsceneClass;
	}


	onAdded() {
		super.onAdded();

		this.boardSize = null;
		this.name = 'Computer Level';

		this.boardSize = new THREE.Vector2(4/3, 1);

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

		this.remainingToLoad = 2;

		new THREE.CubeTextureLoader()
			.setPath( '/ressources/3d/computerCubemap/' )
			.load( [
				'px.jpg',
				'nx.jpg',
				'py.jpg',
				'ny.jpg',
				'pz.jpg',
				'nz.jpg'
		], (tex) => {
			this.screenEnvMap = tex;
			this.loadComplete();
		} );

		state.engine.gltfLoader.load('/ressources/3d/computerScene.glb', (gltf) => {

			this.gltfToDispose = gltf.scene;
			this.add(gltf.scene);

			{  // Screen render target
				const screenMaterial = UTILS.findMaterialInHierarchy(gltf.scene, "Screen");
				if (!(screenMaterial instanceof THREE.MeshStandardMaterial))  throw Error("screen't");

				this.rt = new THREE.WebGLRenderTarget(640, 480);

				this.rtCamera = new THREE.PerspectiveCamera(90, this.rt.width/this.rt.height);
				this.rtCamera.position.set(0, 0, -1.1);
				this.rtCamera.rotateX(UTILS.RAD180);

				screenMaterial.roughness = 0;
				screenMaterial.emissive = new THREE.Color("#ffffff");  //THIS IS NEEDED: it multiplies emissiveMap.
				screenMaterial.emissiveMap = this.rt.texture;
				screenMaterial.emissiveIntensity = 1;
			}  // Screen render target

			UTILS.autoMaterial(gltf.scene);  // call again just in case
			this.loadComplete();
		});
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.rtScene) {
			const prevTarget = state.engine.renderer.getRenderTarget();

			try {
				this.rtScene.onFrame(delta, time);
				state.engine.renderer.setRenderTarget(this.rt);
				state.engine.renderer.render(this.rtScene, this.rtCamera);
			} catch (error) {
				console.error("Computer is being silly:", error);
			}

			state.engine.renderer.setRenderTarget(prevTarget);
		}
	}


	onLoadComplete() {
		const screenMaterial = UTILS.findMaterialInHierarchy(this, "Screen");
		if (!(screenMaterial instanceof THREE.MeshStandardMaterial))  throw Error("screen't");

		if (this === window.idleLevel) {
			state.engine.scene = this;
			window.idleLevel = undefined;
		} else {
			state.engine.scene = this;
		}

		screenMaterial.envMap = this.screenEnvMap;
		this.rtScene = new this.subsceneClass();
		this.rtScene.onAdded();
	}


	dispose() {
		super.dispose();
		UTILS.disposeHierarchy(this.gltfToDispose);
		if (this.rt)  this.rt.dispose();
		if (this.rtScene && this.rtScene.dispose)  this.rtScene.dispose();
	}

}

