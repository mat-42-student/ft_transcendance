import { ChatApp } from './Chat.js';
import { SocialApp } from './Social.js';
import { Game } from './Game.js';
import { Mmaking } from './mmaking.js';
import { state } from './main.js';
import { delay } from './main.js';

export class MainSocket {

	constructor() {
		if (!state.client.accessToken) {
			console.error("client.accessToken unavailable");
			return;
		}
		state.socialApp = new SocialApp();
		state.chatApp = new ChatApp();
        delay(1);
		let socketURL = "wss://" + window.location.hostname + ":3000/ws/?t=" + state.client.accessToken;
		// wss://localhost:3000/ws/?t=
		this.socket = new WebSocket(socketURL);
		state.chatApp = new ChatApp();
		state.socialApp = new SocialApp();
		state.mmakingApp = new Mmaking();
		state.gameApp = new Game();

		this.socket.onerror = async (e)=> {
			console.error(e.message);
		};

        this.socket.onopen = async function(e) {
			// console.log("mainSocket connected");
        };

		this.socket.onclose = async (e)=> { 
			// console.log("mainSocket disconnected");
		};

		this.socket.onmessage = async (e)=> {
			let data = JSON.parse(e.data);
			// console.log(JSON.stringify(data, null, 2));
			switch (data['header']['service']) {
				case 'chat':
					state.chatApp.incomingMsg(data);
					break;
				case 'social':
					state.socialApp.incomingMsg(data.body);
					break
				case 'mmaking':
					//if (await state.mmakingApp.waited_page)
						state.mmakingApp.incomingMsg(data);
					break;
				default:
				console.warn('mainSocket : could not handle incoming JSON' + JSON.stringify(data, null, 2));
			}
		};       
    };

	send(data) {
		this.socket.send(data);
	}

    close() {
        state.chatApp.close();
        state.chatApp = null;
        state.socialApp.close();
		state.socialApp = null;
		// state.mmakingApp.close();
		// state.mmakingApp = null;
        this.socket.close();
        this.socket = null;
    }
}