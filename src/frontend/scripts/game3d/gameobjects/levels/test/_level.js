import * as THREE from 'three';
import engine from '../../../engine.js';
import LevelBase from '../LevelBase.js';


export default class LevelTest extends LevelBase {
	constructor() {
		super();

		// throw "TODO: wip"

		this.load();

		engine.clearLevel();
		engine.environmentScene.fog = null;
		engine.environmentScene.background = this.skybox;

		this.size = new THREE.Vector2(1.5, 1);

		this.cameras = __makeCameraAngles();

		engine.cameraTarget.diagonal = 40;
		engine.cameraTarget.teleportNow = true;
		engine.cameraTarget.mousePositionMultiplier.set(0.1, 0.1);
		engine.cameraTarget.mouseRotationMultiplier.set(3, 3);
		engine.cameraTarget.smoothSpeed = 15;

		this.addGameobjects();
	}


	dispose() {
		super.dispose();

		this.skybox.dispose();
		//TODO
	}


	load() {
		this.loadingCounter = 0;

		{
			const loader = new THREE.CubeTextureLoader();

			loader.setPath( '/ressources/3d/tex/test_cubemap/' );

			this.loadingCounter++;
			this.skybox = loader.load( [
				'px.jpg', 'nx.jpg',
				'py.jpg', 'ny.jpg',
				'pz.jpg', 'nz.jpg'
			]);
		}
	}

	addGameobjects() {
		//TODO
	}

}


function __makeCameraAngles() {
	const neutralCamera = new LevelBase.CameraStats();
	// neutralCamera.position = new THREE.Vector3(0, 0.65, -0.4);
	// neutralCamera.quaternion = __lookDownQuaternion(180, 60);
	neutralCamera.fov = 60;

	const p0Camera = new LevelBase.CameraStats();
	// p0Camera.position = new THREE.Vector3(0.6, 0.45, 0);
	// p0Camera.quaternion = __lookDownQuaternion(90, 45);
	p0Camera.fov = 55;

	const p1Camera = new LevelBase.CameraStats();
	// p1Camera.position.copy(p0Camera.position).x *= -1;
	// p1Camera.quaternion = __lookDownQuaternion(-90, 45);
	p1Camera.fov = p0Camera.fov;

	return [p0Camera, p1Camera, neutralCamera];
}
