import * as THREE from 'three';
import { state } from '../../../../main.js';
import LevelBase from '../LevelBase.js';
import DebugBall from './DebugBall.js';
import DebugPaddle from './DebugPaddle.js';
import DebugBoard from './DebugBoard.js';
import * as UTILS from '../../../../utils.js';
import DebugScoreIndicator from './DebugScoreIndicator.js';
import SceneOriginHelper from '../../utils/SceneOriginHelper.js';


export default class LevelDebug extends LevelBase {
	constructor() {
		super();

		this.boardSize = new THREE.Vector2(1.5, 1);
		this.name = 'Debug Level';

		this.background = new THREE.Color('#112211');
		this.fog = null;

		this.#setupViews();
	}


	onAdded() {
		super.onAdded();

		this.add(new DebugBall());
		this.add(new DebugPaddle(0));
		this.add(new DebugPaddle(1));
		this.add(new DebugScoreIndicator(0));
		this.add(new DebugScoreIndicator(1));
		this.add(new DebugBoard());
		this.add(new SceneOriginHelper());

		this.smoothCamera.diagonal = 40;
		this.smoothCamera.mousePositionMultiplier.set(0.1, 0.1);
		this.smoothCamera.mouseRotationMultiplier.set(0.1, 0.1);
		this.smoothCamera.smoothSpeed = 15;
	}


	dispose() {
		super.dispose();
	}


	#setupViews() {
		this.views.position[2].set(0, 1.2, -0.8);
		this.views.quaternion[2].copy(UTILS.makeLookDownQuaternion(180, 60));
		this.views.fov[2] = 60;

		this.views.position[0].set(1.1, 0.8, 0);
		this.views.quaternion[0].copy(UTILS.makeLookDownQuaternion(90, 45));
		this.views.fov[1] = this.views.fov[0] = 55;

		this.views.position[1].copy(this.views.position[0]).x *= -1;
		this.views.quaternion[1].copy(UTILS.makeLookDownQuaternion(-90, 45));
	}

}
