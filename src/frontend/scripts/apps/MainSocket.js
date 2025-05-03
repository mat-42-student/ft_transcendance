import { ChatApp } from './Chat.js';
import { SocialApp } from './Social.js';
import { Mmaking } from './mmaking.js';
import { state } from '../main.js';
import { renderFriendProfile } from '../pages.js';

export class MainSocket {

	constructor() {
		if (!state.client.accessToken) {
			console.error("client.accessToken unavailable");
			return;
		}
	}

	init() {
		let socketURL = "wss://" + window.location.hostname + ":3000/ws/?t=" + state.client.accessToken;
		// ws://localhost:3000/ws/?t=
		this.didSocketOpen = false;
		this.socket = new WebSocket(socketURL);
		state.chatApp = new ChatApp();
		state.socialApp = new SocialApp();
		// await state.socialApp.render();
		// state.socialApp.startPollingPendingCount();  // Lancement automatique du polling
		state.mmakingApp = new Mmaking();

		this.socket.onerror = async (e)=> {
			if (state.mainSocket?.didSocketOpen == false) {
				// socket failed to open
				if (state.client)
					state.client.logout();
			} else {
				console.error(e.message);
			}
		};

        this.socket.onopen = async function(e) {
			if (state.mainSocket)
				state.mainSocket.didSocketOpen = true;
			// console.log("mainSocket connected");
        };

		this.socket.onclose = async (e)=> {
			// console.log("mainSocket disconnected");
			if (state.mainSocket)
				state.mainSocket.didSocketOpen = false;
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
				case 'notify':
					// console.log("mainSocket : incoming notify");
					state.socialApp.renderNoBuild();
					renderFriendProfile(data);
					break;
				default:
				console.warn('mainSocket : could not handle incoming JSON' + JSON.stringify(data, null, 2));
			}
		};
    };

	send(data) {
		// I added this check because it appears that sending without while still .CONNECTING
		// breaks the socket permanently? Not sure about this...
        try{
            this.socket.send(data);
        }
        catch(DomException){
            console.error('Tried to send data over the main socket, but it is not open.\n',
                'Data that could not be sent:', data);
        }
        // if (this.socket.readyState == this.socket.OPEN)
		// 	this.socket.send(data);
		// else
		// 	console.error('Tried to send data over the main socket, but it is not open.\n',
		// 		'Data that could not be sent:', data);
	}

	// Ajout verifs
	close() {
		if (this.socket) {
			this.socket.close();
			this.socket = null;
		}
		if (state.chatApp) {
			state.chatApp.close();
			state.chatApp = null;
		}
		if (state.socialApp) {
			state.socialApp.close();
			state.socialApp = null;
		}
		// state.mmakingApp.close();
		// state.mmakingApp = null;
	}
}