import game from "game";
import engine from "engine";


export default class MatchBase {

    keyCodes = new Set([]);
    get playerKeys() {
        const isFocusNeutral = game.cameraFocus < 0;
        return [
            {
                positive: isFocusNeutral ? 'KeyW' : 'KeyA',
                negative: isFocusNeutral ? 'KeyS' : 'KeyD',
            },
            {
                positive: isFocusNeutral ? 'ArrowUp' : 'ArrowRight',
                negative: isFocusNeutral ? 'ArrowDown' : 'ArrowLeft',
            },
        ];
    };


    constructor(params) {
        game.usernames[0] = params.localPlayerName;
    }


    startMatch() {
        this.keyDownEvent = this.keyDown.bind(this);
        this.keyUpEvent = this.keyUp.bind(this);
        document.body.addEventListener('keydown', this.keyDownEvent);
        document.body.addEventListener('keyup', this.keyUpEvent);
    }


	onFrame(delta, time) {
    }


	stopPlaying() {
        document.body.removeEventListener('keydown', this.keyDownEvent);
        document.body.removeEventListener('keyup', this.keyUpEvent);
    }


    keyDown(event) {
        // KeyboardEvent.code ignores keyboard layout, only cares about physical position.
        this.keyCodes.add(event.code);
    }


    keyUp(event) {
        this.keyCodes.delete(event.code);
    }
}
