import * as THREE from 'three';
import LevelBase from '../LevelBase.js';
import DebugBall from './DebugBall.js';
import DebugPaddle from './DebugPaddle.js';
import DebugBoard from './DebugBoard.js';
import * as UTILS from '../../../../utils.js';
import DebugScoreIndicator from './DebugScoreIndicator.js';
import SceneOriginHelper from '../../utils/SceneOriginHelper.js';
import BoardAnchor from '../../utils/BoardAnchor.js';
import TextMesh from '../../utils/TextMesh.js';
import DebugPauseText from './DebugPauseText.js';
import { state } from '../../../../main.js';
import Cross2DHelper from '../../utils/Cross2DHelper.js';


export default class LevelDebug extends LevelBase {


	onAdded() {
		super.onAdded();

		this.boardSize = new THREE.Vector2(1.5, 1);
		this.name = 'Debug Level';

		this.background = new THREE.Color('#112211');
		this.fog = null;

		{
			this.views.position[2].set(0, 1.2, -0.8);
			this.views.quaternion[2].copy(UTILS.makeLookDownQuaternion(180, 60));
			this.views.fov[2] = 60;

			this.views.position[0].set(1.4, 1.2, 0);
			this.views.quaternion[0].copy(UTILS.makeLookDownQuaternion(90, 45));
			this.views.fov[1] = this.views.fov[0] = 40;

			this.views.position[1].copy(this.views.position[0]).x *= -1;
			this.views.quaternion[1].copy(UTILS.makeLookDownQuaternion(-90, 45));
		}

		this.gameplayObjects = new THREE.Group();
		this.add(this.gameplayObjects);

		this.gameEndObjects = new THREE.Group();
		this.add(this.gameEndObjects);

		this.gameplayObjects.add(new DebugBall());
		this.gameplayObjects.add(new DebugPaddle(0));
		this.gameplayObjects.add(new DebugPaddle(1));

		this.add(new DebugBoard());
		this.add(new SceneOriginHelper());

		this.smoothCamera.diagonal = 40;
		this.smoothCamera.mousePositionMultiplier.set(0.1, 0.1);
		this.smoothCamera.mouseRotationMultiplier.set(0.1, 0.1);
		this.smoothCamera.smoothSpeed = 5;

		{
			const top = new BoardAnchor(-0.1, -0.1, 0.8, this);
			const bottom = new BoardAnchor(-0.1, -0.1, -0.8, this);

			this.gameplayObjects.add(top);
			this.gameplayObjects.add(bottom);

			top.left.add(new DebugScoreIndicator(0));
			top.right.add(new DebugScoreIndicator(1));

			this.textMaterial = new THREE.MeshBasicMaterial({color: '#88ff88'});

			this.nameTextMeshes = [
				new TextMesh(this.textMaterial, '???'),
				new TextMesh(this.textMaterial, '???')
			]
			bottom.left.add(this.nameTextMeshes[0]);
			bottom.right.add(this.nameTextMeshes[1]);
			this.nameTextMeshes.forEach((nameTextMesh) => {
				nameTextMesh.scale.setScalar(0.5);
			})

			const toRotate = [top.left, top.right, bottom.left, bottom.right];
			toRotate.forEach(
				(object3d) => {
					object3d.rotateY(UTILS.RAD180);
					object3d.rotateX(- UTILS.RAD90);
				}
			);

			this.flipFunction = () => {
				toRotate.forEach((object3d) => {
					let facing = 0;
					switch (this.viewIndex) {
						case 0:
							facing = -UTILS.RAD90;
							break;
						case 1:
							facing = UTILS.RAD90;
							break;
					}
					object3d.rotateZ(facing)
				});
			}
		}

		// Debug level does not load any external resources, so it can mark itself as loaded immediately.
		state.engine.scene = this;
	}


	dispose() {
		super.dispose();

		if (this.textMaterial) this.textMaterial.dispose();
	}


	namesReady() {
		this.nameTextMeshes[0].setText(state.gameApp.playerNames[0]);
		this.nameTextMeshes[1].setText(state.gameApp.playerNames[1]);
		if (this.flipFunction)
			this.flipFunction();
	}


	pause(time) {
		super.pause(time);
		this.gameplayObjects.add(new DebugPauseText('Ready...', time));
	}

	unpause() {
		if (super.unpause()) {
			this.gameplayObjects.add(new DebugPauseText('Go!', 0.5));
		}
	}


	endShowWinner(
		scores = [NaN, NaN],
		winner = NaN,
		playerNames = ['?1', '?2'],
	) {
		super.endShowWinner(scores, winner, playerNames);

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		this.#endClear();
		const text = new TextMesh(this.textMaterial,
			`${scores[0]} : ${scores[1]}\n\n${playerNames[winner]}\nwon!`,
			true, true
		);
		text.rotateX(-UTILS.RAD90);
		text.rotateZ(UTILS.RAD180);
		this.gameEndObjects.add(text);
	}

	endShowWebOpponentQuit(opponentName) {
		super.endShowWebOpponentQuit(opponentName);

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		this.#endClear();
		const text = new TextMesh(this.textMaterial,
			`Your opponent\n${opponentName}\nquit!\n`
			+ "This match will show\nas a win on your\nprofile.\n",
			true, true
		);
		text.rotateX(-UTILS.RAD90);
		text.rotateZ(UTILS.RAD180);
		this.gameEndObjects.add(text);
	}

	endShowYouRagequit() {
		super.endShowYouRagequit();

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		this.#endClear();
		const text = new TextMesh(this.textMaterial,
			`don't ragequit!\nThis match will show\nas a loss on your\nprofile.`,
			true, true
		);
		text.rotateX(-UTILS.RAD90);
		text.rotateZ(UTILS.RAD180);
		this.gameEndObjects.add(text);
	}

	endShowNothing() {
		super.endShowNothing();

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		this.#endClear();
	}

	endHideResult() {
		super.endHideResult();

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		if (this.gameEndObjects) {
			this.remove(this.gameEndObjects);
			this.gameEndObjects = undefined;
		}
	}

	#endClear() {
		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		if (this.gameplayObjects) {
			this.remove(this.gameplayObjects);
			this.gameplayObjects = undefined;
		}

		this.views = null;
		this.smoothCamera.position.set(0, 5, 0);
		this.smoothCamera.quaternion.setFromAxisAngle(
			new THREE.Vector3(1,0,0), -UTILS.RAD90);
		this.smoothCamera.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(0, 0,1), UTILS.RAD180));
		this.smoothCamera.fov = 20;
		this.smoothCamera.mouseRotationMultiplier.setScalar(0.02);
		this.smoothCamera.mousePositionMultiplier.setScalar(0.02);

		const x = new Cross2DHelper('#224422');
		x.rotateY(UTILS.RAD90/2);
		this.add(x);
	}

}
