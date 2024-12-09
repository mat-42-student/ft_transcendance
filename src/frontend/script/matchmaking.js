import global from 'global';
import * as LOCAL_GAME from './localGame.js'
import * as ROUTER from './router.js';


// 'Export' globally so html onclick has a way of accessing these.
window.modeMatchmaking = modeMatchmaking;
window.modeTournament = modeTournament;
window.mode1v1 = mode1v1;
window.modeCPU = modeCPU;


export function modeMatchmaking(){
    throw "TODO: matchmaking game";
    setupWebSocket('2P');
}

export function modeTournament() {
    throw "TODO: tournament game";
    setupWebSocket('4P')
}

export function mode1v1() {
    LOCAL_GAME.startLocalGame(false);
    ROUTER.navigateTo('/page/playing');
}

export function modeCPU() {
    LOCAL_GAME.startLocalGame(true);
    ROUTER.navigateTo('/page/playing');
}


function showLobby() {
    // Vérifier si le lobby est déjà affiché
    let lobbyContainer = document.getElementById('lobbyContainer');
    if (!lobbyContainer) {
        // Création du conteneur du lobby
        lobbyContainer = document.createElement('div');
        lobbyContainer.id = 'lobbyContainer';
        lobbyContainer.classList.add('lobby-container');

        // Création du contenu du lobby
        lobbyContainer.innerHTML = `
            <h1>Lobby de Jeu Pong</h1>
            <div class="players">
                <div class="player" id="player1">Joueur 1 : En attente...</div>
                <div class="player" id="player2">Joueur 2 : En attente...</div>
            </div>
            <div class="status">
                <p>En attente de joueurs...</p>
            </div>
            <button id="startButton" disabled>Commencer la Partie</button>
        `;

        // Ajouter le conteneur du lobby au corps de la page
        document.body.appendChild(lobbyContainer);
    }

    // Afficher le conteneur du lobby
    lobbyContainer.classList.remove('hidden');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// script.js

function setupWebSocket(game_mode) {
    sendPostRequest();
    const userid = document.getElementById("idclient").value;
    console.log(userid);
    const socket = new WebSocket('wss://' +  window.location.hostname + ':3000/api/soloq/1vs1/');
    let idsalon = null

    socket.onopen = async function(e) {
        console.log('[OPEN] Connexion établie');
                // Exemple de données à envoyer au backend via WebSocket
        const data = {
            action: 'send_data',
            payload: {
                mode: game_mode,
                user_id: userid,
                endgame: false
            }
        };
       // showLobby();
        socket.send(JSON.stringify(data));
    };

    socket.onmessage = async function(e) {
        const data = JSON.parse(e.data);
        console.log(data);
        if (data.idsalon)
            idsalon = data.idsalon
        if (data.ingame)
            alert("already in game");
        if (data.winner == true)
        {
            alert('you are the winner !');
            if (data.mode == '4P')
            {
                // wait dans un salon
            }
        }
        else if (data.winner == false)
        {
            alert('you are the looser !');
        }
        if (data.disconect == true && data.user == userid)
        {
            socket.close();
            return
        }
        if (data.start == true)
        {
            if (data.nbgame)
            {
                console.log("Contacting pong container");
                launchSocket(userid, idsalon, socket);

            }
        }

        console.log('[MESSAGE] Data reçue socket:', data);

    };

    socket.onclose = function(e) {
        console.log('[CLOSE] Connexion fermée');
    };

    socket.onerror = function(e) {
        console.error('[ERROR] Une erreur est survenue:', e);
    };
}

