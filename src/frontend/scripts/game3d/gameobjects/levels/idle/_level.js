import * as THREE from 'three';
import { state } from '../../../../main.js';
import LevelBase from '../LevelBase.js';


export default class LevelIdle extends LevelBase {

	constructor() {
		super();

		this.size = null;

		throw "TODO idle level camera";
		// this.cameras[0] = ;
		// this.cameras[2] = this.cameras[1] = this.cameras[0];
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);
	}


	dispose() {
		super.dispose();
		console.error('LevelIdle.dispose() is never supposed to execute.\n',
			'This scene is meant to never be deleted or replaced.'
		);
	}
}

