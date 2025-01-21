import { ChatApp } from './chat.js';
import { SocialApp } from './social.js';
import { Mmaking } from './mmaking.js';

export class MainSocket {

	constructor(token)
	{
		// console.log("Joining wss://" + window.location.hostname + ":3000/ws/ with token : \n" + token);
		this.socketURL = "wss://" + window.location.hostname + ":3000/ws/?t=" + token;
		this.mainSocket = new WebSocket(this.socketURL);
		this.chat = new ChatApp(this.mainSocket);
		this.social = new SocialApp(this.mainSocket);


		this.mainSocket.onerror = async (e)=> {
			console.error(e.message);
		};

        this.mainSocket.onopen = async function(e) {
        };

		this.mainSocket.onclose = async (e)=> { 
			console.log("MainWS is disconnected")
		};

		this.mainSocket.onmessage = async (e)=> {
			let data = JSON.parse(e.data);
			// console.log(JSON.stringify(data, null, 2));
			switch (data['header']['service']) {
				case 'chat':
					this.chat.incomingMsg(data);
					break;
				case 'social':
					this.social.incomingMsg(data.body);
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