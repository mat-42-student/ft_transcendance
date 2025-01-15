import { ChatApp } from './chat.js';
import { SocialApp } from './social.js';
import { Mmaking } from './mmaking.js';

export class MainSocket {

	constructor(token)
	{
		console.log("Joining wss://" + window.location.hostname + ":3000/ws/ with token : \n" + token);
		this.socketURL = "wss://" + window.location.hostname + ":3000/ws/?t=" + token;
		this.mainSocket = new WebSocket(socketURL);
		this.chat = new ChatApp(mainSocket);
		this.social = new SocialApp(mainSocket);
		this.mmaking = new Mmaking(mainSocket);

		mainSocket.onerror = async function(e) {
			console.error(e.message);
		};

        mainSocket.onopen = async function(e) {
        };

		mainSocket.onclose = async function(e) { 
			console.log("MainWS is disconnected")
		};

		mainSocket.onmessage = async function(e) {
			let data = JSON.parse(e.data);
			// console.log(JSON.stringify(data, null, 2));
			switch (data['header']['service']) {
				case 'chat':
					this.chat.incomingMsg(data);
					break;
				case 'social':
					this.social.incomingMsg(data);
					break
				case 'mmaking':
					console.log(data);
					break;
				default:
				console.log('Could not handle incoming JSON');
			}
		};       
    };
}