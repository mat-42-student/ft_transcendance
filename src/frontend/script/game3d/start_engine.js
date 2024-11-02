import engine from 'engine';
import * as THREE from 'three';
import * as GAMEOBJECTS from 'gameobjects';


engine.initialize();

{  // Environment setup
	engine.scene.background = new THREE.Color("#112211");
	engine.camera.position.y = 10;
	engine.camera.rotateX(THREE.MathUtils.degToRad(-90));
	engine.camera.rotateZ(THREE.MathUtils.degToRad(180));
}

{  // Gameobjects setup
	//TODO add gameobjects that actually start the game
	//     -> how to react to URL on page load? redirect to home? redirect to matchmaking?
	const debugthing = new GAMEOBJECTS.UTILS.DebugBoxObject();
	engine.scene.add(debugthing);
	debugthing.html_div.innerText = 'hello world';

	const thing3d = new GAMEOBJECTS.UTILS.SceneOriginHelper();
	engine.scene.add(thing3d);
}

//TODO limit framerate while not in focus?
//TODO not sure if this is the part of the program responsible for calling frames
requestAnimationFrame(frame);
function frame(time) {
	engine.render(time);
	requestAnimationFrame(frame);
}
