import { state } from './main.js';

export class Game {

    constructor() {
        this.opponent = null;
        this.socket = null;
	}

    launchGameSocket() {
        alert("gameSocket");
        let socketURL = "wss://" + window.location.hostname + ":3000/game/4/?t=" + state.client.accessToken;
        this.socket = new WebSocket(socketURL);
    }

    addEventlistener() {
        document.getElementById("btn-test-game").addEventListener('click', this.launchGameSocket);
    }

	send(data) {
		this.socket.send(data);
	}

    close() {
        this.socket.close();
        this.socket = null;
    }
}