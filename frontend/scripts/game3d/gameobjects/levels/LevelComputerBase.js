import * as THREE from 'three';
import * as UTILS from '../../../utils.js';
import LevelBase, { onObjectAddedToScene } from './LevelBase.js';
import { state } from '../../../main.js';


export default class LevelComputerBase extends LevelBase {

	constructor(subsceneClass) {
		super();
		this.subsceneClass = subsceneClass;
		this.gltfToDispose = [];
		this.forceVerticalInputs = true;
	}


	onAdded() {
		super.onAdded();

		this.boardSize = null;
		this.name = 'Computer Level';

		this.boardSize = new THREE.Vector2(4/3, 1);

		this.background = new THREE.Color("#000000");

		this.useDefaultCameraAngle();

		this.remainingToLoad = 6;

		new THREE.CubeTextureLoader()
			.setPath( '/ressources/3d/computerCubemap/' )
			.load( [
				'px.png',
				'nx.png',
				'py.png',
				'ny.png',
				'pz.png',
				'nz.png'
		], (tex) => {
			this.screenEnvMap = tex;
			this.loadComplete();
		} );

		state.engine.gltfLoader.load('/ressources/3d/computerScene.glb', (gltf) => {

			this.gltfToDispose.push(gltf.scene);
			this.add(gltf.scene);

			{  // Screen render target
				const screenMaterial = UTILS.findMaterialInHierarchy(gltf.scene, "Screen");
				if (!(screenMaterial instanceof THREE.MeshStandardMaterial))  throw Error("screen't");

				const transparentMaterial = UTILS.findMaterialInHierarchy(gltf.scene, "Baked Transparent");
				if (transparentMaterial) {
					transparentMaterial.transparent = true;
					transparentMaterial.opacity = 0.7;
				}

				this.rt = new THREE.WebGLRenderTarget(640, 480);

				this.rtCamera = new THREE.PerspectiveCamera(90, this.rt.width/this.rt.height);

				screenMaterial.roughness = 0;
				screenMaterial.emissive = new THREE.Color("#ffffff");  //THIS IS NEEDED: it multiplies emissiveMap.
				screenMaterial.emissiveMap = this.rt.texture;
				screenMaterial.emissiveIntensity = 1;
			}  // Screen render target

			UTILS.autoMaterial(gltf.scene);  // call again just in case
			this.loadComplete();
		});

		state.engine.gltfLoader.load('/ressources/3d/retroboard.glb', (gltf) => {

			this.gltfToDispose.push(gltf.scene);
			this.retroBoardModel = gltf.scene;

			this.loadComplete();
		});

		state.engine.gltfLoader.load('/ressources/3d/trophy.glb', (gltf) => {

			this.gltfToDispose.push(gltf.scene);
			this.trophyModel = gltf.scene;

			let core, wireframe;
			for (let i = 0; i < this.trophyModel.children.length; i++) {
				const mesh = this.trophyModel.children[i];
				if (mesh.name == 'Wireframe')
					wireframe = mesh;
				else if (mesh.name == 'Solid')
					core = mesh;
			}

			core.material = new THREE.MeshBasicMaterial({color: "#000000"});
			wireframe.material = new THREE.MeshBasicMaterial({color: "#ffffff", wireframe: true});

			this.loadComplete();
		});

		state.engine.gltfLoader.load('/ressources/3d/keys.glb', (gltf) => {

			this.gltfToDispose.push(gltf.scene);
			this.keysModels = {};

			const mat = new THREE.MeshBasicMaterial({color: "#cccc22", wireframe: true});
			gltf.scene.children.forEach((obj) => {
				this.keysModels[obj.name] = obj;
				obj.material = mat;
			});

			this.loadComplete();
		});

		state.engine.gltfLoader.load('/ressources/3d/disconnect.glb', (gltf) => {

			this.gltfToDispose.push(gltf.scene);
			this.disconnectModels = [];

			const coreMaterial = new THREE.MeshBasicMaterial({color: "#440000"});
			const wireMaterial = new THREE.MeshBasicMaterial({color: "#ff6666", wireframe: true});

			gltf.scene.children.forEach((obj, i) => {
				this.disconnectModels[i] = obj;
				obj.material = wireMaterial;
				obj.children[0].material = coreMaterial;
			});

			this.loadComplete();
		});
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.rtScene) {
			this.subsceneCallOnRender(delta, time);

			// Try/catch is important to make sure the renderer can not remain stuck in the subscene.
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


	namesReady() {
		this.rtScene?.namesReady?.();
	}


	onLoadComplete() {
		const screenMaterial = UTILS.findMaterialInHierarchy(this, "Screen");
		if (!(screenMaterial instanceof THREE.MeshStandardMaterial))  throw Error("screen't");

		if (this === state.levelLoadingTempStorage) {
			state.engine.scene = this;
			state.levelLoadingTempStorage = null;
		} else {
			state.engine.scene = this;
		}

		screenMaterial.envMap = this.screenEnvMap;
		this.setRtScene(new this.subsceneClass(this));
	}


	setRtScene(newScene) {
		if (this.rtScene) {
			this.rtScene._listeners?.removed?.forEach((eventHandler) => {
				eventHandler({target: this.rtScene});
			});
		}

		this.rtScene = newScene;

		// Because the subscene is never added into the "normal" object tree,
		// my custom functions don't work.
		// Injecting these events manually here fixes that.
		// The only exception is onFrame, but we call that manually in this class's onFrame.
		const fakeEvent = { child: this.rtScene };
		onObjectAddedToScene(fakeEvent);
	}


	/**
	 * Manually call onFrame for every object in the subscene.
	 * Engine can't do that automatically: these objects are in a different hierarchy,
	 * it's not even aware of them.
	 *
	 * But the code an identical copy of what Engine does to objects in the normal
	 * scene, nothing special is happening here.
	 *
	 * Dubious design choice. Ship it.
	 */
	subsceneCallOnRender(delta, time) {
		const updateQueue = [];

		this.rtScene?.traverse((obj) => {
			if ('onFrame' in obj) {
				updateQueue.push(obj.onFrame.bind(obj));
			}
		});

		for (const objectRenderFunction of updateQueue) {
			objectRenderFunction(delta, time);
		}
	}


	dispose() {
		super.dispose();
		this.gltfToDispose.forEach((m) => {UTILS.disposeHierarchy(m);});
		if (this.rt)  this.rt.dispose();
		if (this.rtScene && this.rtScene.dispose)  this.rtScene.dispose();
	}


	pause(time) {
		super.pause(time);
		if (this.rtScene?.timerIndicator) {
			this.rtScene.timerIndicator.setWait(time);
		}
	}

	unpause() {
		const justUnpaused = super.unpause();
		if (justUnpaused && this.rtScene?.timerIndicator) {
			this.rtScene.timerIndicator.setGo();
		}
		return justUnpaused;
	}


	endShowWinner(
		scores = [NaN, NaN],
		winner = NaN,
		playerNames = ['?1', '?2'],
	) {
		super.endShowWinner(scores, winner, playerNames);
		this.rtScene?.endShowWinner?.(scores, winner, playerNames);
	}
	endShowWebOpponentQuit(opponentName) {
		super.endShowWebOpponentQuit(opponentName);
		this.rtScene?.endShowWebOpponentQuit?.(opponentName);
	}
	endShowYouRagequit() {
		super.endShowYouRagequit();
		this.rtScene?.endShowYouRagequit?.();
	}
	endShowNothing() {
		super.endShowNothing();
		this.rtScene?.endShowNothing?.();
	}
	endHideResult() {
		super.endHideResult();
		this.rtScene?.endHideResult?.();
	}


	useDefaultCameraAngle() {
		this.views = null;

		const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), UTILS.RAD90 / 3);
		this.smoothCamera.position.set(4, 1, 7);
		this.smoothCamera.quaternion.copy(q1);
		this.smoothCamera.fov = 39.6;
		this.smoothCamera.smoothSpeed = 20;
		const reduceY = 0.5;
		this.smoothCamera.mousePositionMultiplier.set(2, 2 * reduceY);
		this.smoothCamera.mouseRotationMultiplier.set(0.5, 0.5 * reduceY);
		this.smoothCamera.diagonal = 36.87;  // 4:3 aspect ratio, arbitrarily
	}


	useScreenCameraAngle() {
		this.views = null;

		this.smoothCamera.position.set(0, 0, 4);
		this.smoothCamera.quaternion.copy(new THREE.Quaternion());
		this.smoothCamera.fov = 30;
		this.smoothCamera.smoothSpeed = 5;
		this.smoothCamera.mousePositionMultiplier.setScalar(0.5);
		this.smoothCamera.mouseRotationMultiplier.setScalar(0.1);
		this.smoothCamera.diagonal = 36.87;  // 4:3 aspect ratio, arbitrarily
	}

	useFake2DCameraAngle() {
		this.views = null;

		this.smoothCamera.quaternion.copy(new THREE.Quaternion());
		this.smoothCamera.position.set(0, 0, 25);
		this.smoothCamera.fov = 2.5;
		this.smoothCamera.mousePositionMultiplier.setScalar(0);
		this.smoothCamera.mouseRotationMultiplier.setScalar(0);
		this.smoothCamera.diagonal = 36.87;  // 4:3 aspect ratio, arbitrarily
		this.smoothCamera.teleportNow = true;
	}

}
