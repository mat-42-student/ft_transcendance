import ScoreIndicator from "../../gameplay/ScoreIndicator.js";
import TextMesh from "../../utils/TextMesh.js";


export default class RetroScoreIndicator extends ScoreIndicator {

	constructor(playerIndex, material) {
		super(playerIndex);
		this.#material = material;
	}

	onAdded() {
		this.#textMesh = new TextMesh(this.#material);
		this.add(this.#textMesh);
		this.#textMesh.size = 0.2;
		this.#textMesh.depth = 0;
		this.position.set(this.playerIndex ? 0.5 : -0.5, 0.5, -0.1);
		this.#textMesh.setText('0');
	}

	onFrame(delta, time) {
		super.onFrame(delta, time);
	}

	scoreChanged(score) {
		super.scoreChanged(score);
		this.#textMesh.setText(`${score}`);
	}

	#material;
	#textMesh;

}