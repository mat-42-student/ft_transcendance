import * as THREE from 'three';
import engine from 'engine';
import global from 'global';
import LevelBase from '../LevelBase.js';


export default class LevelTest extends LevelBase {
	constructor() {
		super();

		// throw "TODO: wip"

		this.loadAssets();

		engine.clearLevel();
		engine.environmentScene.fog = null;
		engine.environmentScene.background = this.skybox;

		this.boardDiagonal = 30;

		engine.cameraTarget.diagonal = 40;
		this.cameras = __makeCameraAngles();

		engine.cameraTarget.teleportNow = true;
		engine.cameraTarget.mousePositionMultiplier.set(0.1, 0.1);
		engine.cameraTarget.mouseRotationMultiplier.set(0.1, 0.1);
		engine.cameraTarget.smoothSpeed = 15;

		this.addGameobjects();
	}


	dispose() {
		super.dispose();

		this.skybox.dispose();
		//TODO
	}


	loadAssets() {
		{
			const loader = new THREE.CubeTextureLoader();

			loader.setPath( '/ressources/3d/tex/test_cubemap/' );

			//FIXME doesn't find the files
			this.skybox = loader.load( [
					'px.png', 'nx.png',
					'py.png', 'ny.png',
					'pz.png', 'nz.png'
				],
				(tex)=>{console.log('Loaded')},
				()=>{console.log('Progress')},
				()=>{console.error('Fail')}
			);
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
