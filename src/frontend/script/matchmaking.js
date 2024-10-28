//import { sendGetRequest } from './requestGet.js';

function modeSelection(mode) {
    if (mode === 'matchmaking') {
        console.log("matchmaking");
        inject_code_into_markup("../board.html", "main", "./script/wsgame.js");
        setupWebSocket('2P');
    }
    else if (mode === 'tournament')
    {
        console.log('tournament');
        setupWebSocket('4P')
    }
    else if (mode === '1v1') {
        inject_code_into_markup("../board.html", "main", "./script/local1v1.js")
    }
    else if (mode === 'cpu') {
        inject_code_into_markup("../board.html", "main", "./script/localCPU.js");
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

function setupWebSocket(game_mode) {
    const userid = document.getElementById("idclient").value;
    console.log(userid);
    const socket = new WebSocket('wss://localhost:3000/api/soloq/1vs1/');
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
                launchSocket(userid, data.nbgame, socket);
                // socket1 = new WebSocket("wss://" + window.location.hostname + ":3000/game/" + data.nbgame + "/" + userid + "/");
                // socket1.onopen = async function(e) {
                //     console.log('[OPEN]Successful Connection to pong container');
                //     const info = {
                //         action: 'send_data',
                //         payload: {
                //             userid: userid,
                //             score:  Math.floor(Math.random() * 11),  // * 11 car Math.random() génère un nombre entre 0 (inclus) et 1 (exclus)
                //             salonid: idsalon
                //         }
                //     };
                //     await socket1.send(JSON.stringify(info));
                // };

                // socket1.onclose = async function(e)
                // {
                //     socket1.send(JSON.stringify({
                //         payload: {
                //             disconect: true
                //         }
                //    }));
                //     console.log('[CLOSE] Connexion fermée socket1');
                // }

                // socket1.onmessage = async function(f)
                // {
                //     let data1 = JSON.parse(f.data);
                //     if (data1.endgame == true)
                //     {
                //         socket.send(JSON.stringify({
                //             action: 'send_data',
                //             payload: {
                //                 endgame: true,
                //                 mode: game_mode,
                //             }
                //         }));
                //     }
                //     console.log('[MESSAGE] Data reçue socket1:', data1);
                //     if (data1.disconect == true)
                //     {
                //         socket1.onclose();
                //     }
                // };
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

    };

    socket.onclose = function(e) {
            socket.send(JSON.stringify({ // ?? on ecrit quand c'est fermé ??
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
    // function sendMessage(message) {
    //     socket.send(JSON.stringify(message));
    // }
    // Exemple d'envoi de message
    // sendMessage('Bonjour, WebSocket !');
}


// //cree l'affichage de la page
// document.addEventListener("DOMContentLoaded", function() {

// 	//recuperation de la balise main
// 	const main = document.getElementsByTagName('main')[0];

//     // Créer l'élément h1
//     const h1 = document.createElement("h1");
//     h1.textContent = "Sélectionnez un Mode de Jeu";
    
//     // Créer le conteneur div
//     const settingsDiv = document.createElement("div");
//     settingsDiv.id = "settings";
    
//     // Créer le label pour l'input
//     const playerLabel = document.createElement("label");
//     playerLabel.setAttribute("for", "player_id_input");
//     playerLabel.textContent = "Nom du joueur";
    
//     // Saut de ligne
//     const br1 = document.createElement("br");
    
//     // Créer l'input
//     const playerInput = document.createElement("input");
//     playerInput.type = "text";
//     playerInput.size = 16;
//     playerInput.id = "player_id_input";
    
//     // Créer le bouton Create User
//     const createUserButton = document.createElement("button");
//     createUserButton.textContent = "Create User";
//     createUserButton.onclick = function() {
//         sendPostRequest();
//     };
    
//     // Deuxième saut de ligne
//     const br2 = document.createElement("br");
    
//     // Créer les boutons de sélection de mode
//     const matchmakingButton = document.createElement("button");
//     matchmakingButton.textContent = "Matchmaking 1 vs 1";
//     matchmakingButton.onclick = function() {
//         modeSelection('matchmaking', 13);
//     };
    
//     const tournamentButton = document.createElement("button");
//     tournamentButton.textContent = "Tournoi";
//     tournamentButton.onclick = function() {
//         modeSelection('tournament', 19);
//     };
    
//     // Troisième saut de ligne
//     const br3 = document.createElement("br");
    
//     const localButton = document.createElement("button");
//     localButton.textContent = "1 vs 1 local";
//     localButton.onclick = function() {
//         modeSelection('training');
//     };
    
//     const cpuButton = document.createElement("button");
//     cpuButton.textContent = "CPU";
//     cpuButton.onclick = function() {
//         modeSelection('cpu');
//     };
    
//     // Ajouter les éléments au div
//     main.appendChild(playerLabel);
//     main.appendChild(br1);
//     main.appendChild(playerInput);
// 	settingsDiv.appendChild(h1);
//     settingsDiv.appendChild(createUserButton);
//     settingsDiv.appendChild(br2);
//     settingsDiv.appendChild(matchmakingButton);
//     settingsDiv.appendChild(tournamentButton);
//     settingsDiv.appendChild(br3);
//     settingsDiv.appendChild(localButton);
//     settingsDiv.appendChild(cpuButton);
    
//     // Ajouter les éléments au main 
// 	main.appendChild(settingsDiv);
// });
