//import { sendGetRequest } from './requestGet.js';

function modeSelection(mode, userid) {
        console.log("matchmaking");
    if (mode === 'matchmaking') {
        console.log("matchmaking");
        setupWebSocket(userid,'2P');
      //  sendGetRequest();
    }
    else if (mode === 'tournament')
    {
        console.log('tournament');
        setupWebSocket(userid, '4P')
    }
    else {
        // Traitement pour les autres modes si nécessaire
        alert('Mode sélectionné : ' + mode);
    }
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

function setupWebSocket(userid, game_mode) {
    const socket = new WebSocket('wss://localhost:3000/api/soloq/1vs1/');
    let socket1 = null
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
            socket.onclose();
            return
        }
        if (data.start == true)
        {
            if (data.nbgame)
            {
                socket1 = new WebSocket('wss://localhost:3000/api/game/'+ data.nbgame + '/');
                socket1.onopen = async function(e) {
                    console.log('[OPEN] Connexion établie socket1');
                    const info = {
                        action: 'send_data',
                        payload: {
                            userid: userid,
                            score:  Math.floor(Math.random() * 11),  // * 11 car Math.random() génère un nombre entre 0 (inclus) et 1 (exclus)
                            salonid: idsalon
                        }
                    };
                    await socket1.send(JSON.stringify(info));
                };

                socket1.onclose = async function(e)
                {
                    socket1.send(JSON.stringify({
                        payload: {
                            disconect: true
                        }
                   }));
                    console.log('[CLOSE] Connexion fermée socket1');
                }

                socket1.onmessage = async function(f)
                {
                    let data1 = JSON.parse(f.data);
                    if (data1.endgame == true)
                    {
                        socket.send(JSON.stringify({
                            action: 'send_data',
                            payload: {
                                endgame: true,
                                mode: game_mode,
                            }
                        }));
                    }
                    console.log('[MESSAGE] Data reçue socket1:', data1);
                    if (data1.disconect == true)
                    {
                        socket1.onclose();
                    }
                };
            }
        }

        console.log('[MESSAGE] Data reçue socket:', data);
       

          //  playersConnected = data.group_size;
          //  if (playersConnected <= 2) {
          //      document.getElementById(`player${playersConnected}`).textContent = `Joueur ${playersConnected} : Prêt`;
          //  }

          //  if (playersConnected >= 2) {
          //      document.querySelector(".status p").textContent = "Tous les joueurs sont prêts!";
          //      document.getElementById("startButton").disabled = false;
          //  }

    }
    socket.onclose = function(e) {
            socket.send(JSON.stringify({
            payload: {
                disconect: true
            }
        }));
        console.log('[CLOSE] Connexion fermée');
    };

    socket.onerror = function(e) {
        console.error('[ERROR] Une erreur est survenue:', e);
    };

    // Envoyer un message
    function sendMessage(message) {
        socket.send(JSON.stringify(message));
    }
    // Exemple d'envoi de message
    sendMessage('Bonjour, WebSocket !');
}

//document.addEventListener('DOMContentLoaded', function() {
 //  console.log("ecrand charger")
 // setupWebSocket();
//});
