import { ChatApp } from './chat.js';
import { SocialApp } from './social.js';

document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('bricol_log');
    connectBtn.addEventListener('click', () => {
        bricol_log();
    });
});

function launchMainSocket(token) {
    console.log("Joining wss://" + window.location.hostname + ":3000/ws/");
    const socketURL = "wss://" + window.location.hostname + ":3000/ws/?access_token=" + token['accessToken'];
    const mainSocket = new WebSocket(socketURL);
    const chat = new ChatApp(mainSocket);
    const social = new SocialApp(mainSocket);
    mainSocket.onerror = async function(e) {
        console.error(e.message);
    };

    mainSocket.onopen = async function(e) {
        // Ask for friends status
    };

    mainSocket.onclose = async function(e) { 
        console.log("MainWS is disconnected")
    };

    mainSocket.onmessage = async function(e) {
        let data = JSON.parse(e.data);
        // console.log(JSON.stringify(data, null, 2));
        switch (data['header']['service']) {
            case 'chat':
                chat.chatIncomingMsg(data);
                break;
            case 'social':
                social.chatIncomingMsg(data);
                break
            // case 'mmaking':
            //     go_mmaking(data);
            //     break;
            default:
              console.log('Could not handle incoming JSON');
          }
          
    };
}

function bricol_log() {
    let username = document.getElementById("user_id").value;
    if (!username)
        return;
    document.getElementById("user_id").disabled = true;

    create_user(username);
}

function create_user(username) {
    const data = {
        username: username,
        email: username + "@mail.fr",
        password: "pass"
    };

    fetch("https://localhost:3000/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"  // Spécifie que les données sont en JSON
        },
        body: JSON.stringify(data)  // Convertir l'objet JavaScript en chaîne JSON
    })
    .then(response => {
        // Vérifier si la requête a réussi (code HTTP 200)
        if (response.ok) {
            return response.json();  // Analyser la réponse JSON
        }
        throw new Error('Erreur dans la requête');
    })
    .then(data => {
        console.log('user created');  // Afficher la réponse de l'API
        auth(username);
    })
    .catch(error => {
        console.error('Error creating user:', error);  // Afficher les erreurs éventuelles
    });
}

function auth(username) {
    const data = {
        email: username + "@mail.fr",
        password: "pass"
    };

    fetch("https://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"  // Spécifie que les données sont en JSON
        },
        body: JSON.stringify(data)  // Convertir l'objet JavaScript en chaîne JSON
    })
    .then(response => {
        // Vérifier si la requête a réussi (code HTTP 200)
        if (response.ok) {
            return response.json();  // Analyser la réponse JSON
        }
        throw new Error('Erreur dans la requête');
    })
    .then(data => {
        console.log("auth ok");
        launchMainSocket(data);
    })
    .catch(error => {
        console.error('Erreur:', error);  // Afficher les erreurs éventuelles
    });
}

