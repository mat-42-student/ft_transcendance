import * as THREE from 'three';
import global from 'global';
import engine from 'engine';


export default class PersistentDebug extends THREE.Object3D {

	dAutoResolution;
	dPlaying;
	dNotPlaying;
	dFramerate;


	constructor() {
		super();

		this.name = 'Persistent Debug';

		const make = () => {
			const html = document.createElement('div');
			engine.html_debugBox.appendChild(html);
			return html;
		};

		this.dFramerate = make();

		this.dPlaying = make();
		this.dPlaying.innerText = 'Playing';
		this.dNotPlaying = make();
		this.dNotPlaying.innerText = 'Not playing';
		this.dNotPlaying.classList = __WARN;

		this.dAutoResolution = make();
	}


	onFrame(delta, time) {
		{  // Framerate display
			const FPS = 1.0 / delta;
			let classList = null;
			if (FPS < 30) {
				classList = __WARN;
			} else if (FPS < 55) {
				classList = __ERR;
			}

			this.dFramerate.classList = classList;

			this.dFramerate.innerText = 'FPS: ' + FPS + '\n'
				+ 'Frame time: ' + delta;
		}

		this.dPlaying.style.display = global.isPlaying ? null : 'none';
		this.dNotPlaying.style.display = !global.isPlaying ? null : 'none';
	}


	dispose() {
		engine.html_debugBox.removeChild(this.dAutoResolution);
		engine.html_debugBox.removeChild(this.dFramerate);
		engine.html_debugBox.removeChild(this.dPlaying);
		engine.html_debugBox.removeChild(this.dNotPlaying);
	}
}


const __WARN = 'engine-debug-warn';
const __ERR = 'engine-debug-err';