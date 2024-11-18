import engine from 'engine';
import global from 'global';
import * as THREE from 'three';
import * as GAMEOBJECTS from 'gameobjects';


const clock = new THREE.Clock(true);

engine.initialize();

{  // Environment setup
	engine.scene.background = new THREE.Color("#112211");
	engine.cameraTarget.position.y = 10;
	engine.cameraTarget.rotation = new THREE.Euler(
		THREE.MathUtils.degToRad(-90),
		0,
		THREE.MathUtils.degToRad(180)
	);
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
requestAnimationFrame(frame);
function frame(time) {
	const delta = clock.getDelta();
	if (global.gameFrameFunction != null) global.gameFrameFunction(delta, time);
	engine.render(delta, time);
	setTimeout(() => {
		requestAnimationFrame(frame);
	}, 33);  //REVIEW powersave limit because working in K0
}
