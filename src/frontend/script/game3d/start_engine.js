import * as THREE from 'three';
import Engine from "./Engine.js";

const engine = new Engine({
	antialias: true,
});

engine.id = 'bg-engine';

document.body.insertBefore(engine, document.body.firstChild);

engine.start((engine) => {
	console.log('Start running the game here');

	engine.scene3.background = new THREE.Color(0,0,0);

	const p = document.createElement("div");
	p.innerText = 'hello world'
	engine.debugOverlay.appendChild(p)
});
