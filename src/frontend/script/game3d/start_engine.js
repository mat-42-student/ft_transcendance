import * as THREE from 'three';
import Engine from "./Engine.js";

// Make it a Web Component
customElements.define("general-purpose-engine", Engine);

const engine = new Engine({
	antialias: true,
});
engine.id = 'bg-engine';
document.body.insertBefore(engine, document.body.firstChild);

engine.start((engine) => {
	//TODO not sure what needs to happen here
});
