import { ChatApp } from './chat.js';
import { SocialApp } from './social.js';

export function launchMainSocket(token) {
    console.log("Joining wss://" + window.location.hostname + ":3000/ws/ with token : \n" + token);
    const socketURL = "wss://" + window.location.hostname + ":3000/ws/?t=" + token;
    const mainSocket = new WebSocket(socketURL);
    const chat = new ChatApp(mainSocket);
    const social = new SocialApp(mainSocket);

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
                chat.incomingMsg(data);
                break;
            case 'social':
                social.incomingMsg(data);
                break
            default:
              console.log('Could not handle incoming JSON');
          }
          
    };
}