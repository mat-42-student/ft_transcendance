import engine from 'engine';
import global from 'global';
import * as THREE from 'three';
import * as GAMEOBJECTS from 'gameobjects';


const clock = new THREE.Clock(true);

engine.initialize();

{  // Environment setup
	engine.environmentScene.background = new THREE.Color("#000000");
	engine.cameraTarget.position.y = 14.2535353443;
	const deg90AsRad = THREE.MathUtils.degToRad(90);

	const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -deg90AsRad);
	const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), 2*deg90AsRad);
	engine.cameraTarget.quaternion = q1.multiply(q2);
}

{  // Gameobjects setup
	//TODO if not in game, load a 'main menu' level that has no gameplay
	//     -> how to react to URL on page load? redirect to home? redirect to matchmaking?

	const thing3d = new GAMEOBJECTS.UTILS.SceneOriginHelper();
	thing3d.name = "Scene origin helper";
	engine.environmentScene.add(thing3d);
	engine.cameraTarget.borders = null;
}


requestAnimationFrame(frame);
function frame(time) {
	const delta = clock.getDelta();
	if (global.gameFrameFunction != null) global.gameFrameFunction(delta, time);
	engine.render(delta, time);
	if (global.powersave) {
		setTimeout(() => {
			requestAnimationFrame(frame);
		}, 1 / 10);
	} else {
		requestAnimationFrame(frame);
	}
}
