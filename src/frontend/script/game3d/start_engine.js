import * as THREE from 'three';
import Engine from "./Engine.js";

const engine = new Engine({
	antialias: true,
});
engine.id = 'bg-engine';
document.body.insertBefore(engine, document.body.firstChild);

engine.start((engine) => {
	//TODO
});
