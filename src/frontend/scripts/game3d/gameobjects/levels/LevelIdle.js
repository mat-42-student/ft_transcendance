import * as THREE from 'three';
import * as UTILS from '../../../utils.js';
import LevelBase from './LevelBase.js';
import SceneOriginHelper from '../utils/SceneOriginHelper.js';
import { state } from '../../../main.js';
import TextMesh from '../utils/TextMesh.js';


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
			state.engine.scene = window.idleLevel;
			window.idleLevel = undefined;

			this.gltfToDispose = gltf.scene;
			state.engine.scene.add(gltf.scene);

			{  // Screen render target
				const screenMaterial = UTILS.findMaterialInHierarchy(gltf.scene, "Screen");
				if (!(screenMaterial instanceof THREE.MeshStandardMaterial))  throw Error("screen't");

				this.rt = new THREE.WebGLRenderTarget(640, 480);

				this.rtCamera = new THREE.PerspectiveCamera(90, this.rt.width/this.rt.height);
				this.rtCamera.position.set(0, 0, -1);
				this.rtCamera.rotateX(UTILS.RAD180);

				this.rtScene = new THREE.Scene();
				// this.rtScene.add(new THREE.AxesHelper(1));
				this.rtScene.background = new THREE.Color("#000000");
				this.rtScene.add(new THREE.AmbientLight("#ffffff", 0.2));
				const sun = new THREE.DirectionalLight("#ffffff", 1.8);
				this.rtScene.add(sun);
				sun.position.set(-0.2, 0.2, -1);  // this turns the light
				this.screensaverTextMaterial = new THREE.MeshStandardMaterial({
					color: "#33dd55",
					roughness: 1,
				});
				this.screensaverText = new TextMesh(this.screensaverTextMaterial, null, true, true);
				this.screensaverText.depth = 0.04;
				this.screensaverText.setText("Transcendance");
				this.screensaverText.scale.setScalar(1.2);
				this.rtScene.add(this.screensaverText);

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
				state.engine.renderer.setRenderTarget(this.rt);
				state.engine.renderer.render(this.rtScene, this.rtCamera);
			} catch (error) {
				console.error("Computer is being silly:", error);
			}

			state.engine.renderer.setRenderTarget(prevTarget);

			this.#wiggleScreensaver(delta);
		}
	}


	onLoadComplete() {
		const screenMaterial = UTILS.findMaterialInHierarchy(this, "Screen");
		if (!(screenMaterial instanceof THREE.MeshStandardMaterial))  throw Error("screen't");

		screenMaterial.envMap = this.screenEnvMap;
	}


	dispose() {
		super.dispose();
		UTILS.disposeHierarchy(this.gltfToDispose);
		if (this.rt)  this.rt.dispose();
		if (this.rtScene)  UTILS.disposeHierarchy(this.rtScene);
	}


	#screensaver = {
		direction: 1,
		pos: 0,
		turn: 0,
	};
	#wiggleScreensaver(delta) {
		if (this.#screensaver.direction == 1 && this.#screensaver.pos > 1)
			this.#screensaver.direction = -1;
		else if (this.#screensaver.direction == -1 && this.#screensaver.pos < -1)
			this.#screensaver.direction = 1;

		this.#screensaver.pos += delta * 0.3 * this.#screensaver.direction;
		this.#screensaver.turn += delta * 0.7;

		this.screensaverText.position.x = 0.9 * this.#screensaver.pos;
		this.screensaverText.rotation.y = this.#screensaver.turn;
	}

}

