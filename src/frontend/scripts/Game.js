import { state } from './main.js';

export class Game {

    constructor() {
        this.opponent = null;
        this.launchGameSocket();
	}

    launchGameSocket() {
        alert("gameSocket");
        let socketURL = "wss://" + window.location.hostname + ":3000/game/4/?t=" + state.client.accessToken;
        this.state.gameSocket = new WebSocket(socketURL);
    }
    
}