import engine from 'engine';
import * as THREE from 'three';
import * as GAMEOBJECTS from 'gameobjects';
import * as UTILS from "../utils.js";
import { state } from '../main.js';


const clock = new THREE.Clock(true);

engine.initialize();

{  // Environment setup
	engine.environmentScene.background = new THREE.Color("#000000");
	engine.cameraTarget.position.y = 1.42535353443;
	engine.cameraTarget.smoothSpeed = 1;

	const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -UTILS.RAD90);
	const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), 2*UTILS.RAD90);
	engine.cameraTarget.quaternion = q1.multiply(q2);
}

{  // Gameobjects setup
	//TODO if not in game, load a 'main menu' level that has no gameplay
	//     -> how to react to URL on page load? redirect to home? redirect to matchmaking?

	const thing3d = new GAMEOBJECTS.UTILS.SceneOriginHelper();
	thing3d.name = "Scene origin helper";
	engine.environmentScene.add(thing3d);
	engine.borders = null;
}


requestAnimationFrame(frame);
async function frame(time) {
	const delta = clock.getDelta();
	if (state.gameApp) state.gameApp.frame(delta, time);
	engine.render(delta, time);

	if (UTILS.shouldPowersave === true) {
		setTimeout(() => {
			requestAnimationFrame(frame);
		}, 1.0 / 10.0);  //FIXME this does nothing (still goes full framerate)
	} else {
		requestAnimationFrame(frame);
	}
}
