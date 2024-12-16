let mainSocket;

function launchMainSocket(token) {
    console.log("Joining wss://" + window.location.hostname + ":3000/ws/");
    const socketURL = "wss://" + window.location.hostname + ":3000/ws/?access_token=" + token['accessToken'];
    mainSocket = new WebSocket(socketURL);
    mainSocket.onerror = async function(e) {
        console.error(e.message);
    };

    mainSocket.onopen = async function(e) {
//         await mainSocket.send(JSON.stringify({
//             'header': {
//                 'service': 'chat',
//             },
//             'body': {
//                 'to':'toto34',
//                 'message': 'YO !!',
//             }
// }));
    };

    mainSocket.onclose = async function(e) { 
        console.log("MainWS is disconnected")
    };

    mainSocket.onmessage = async function(e) {
        data = JSON.parse(e.data);
        // console.log(JSON.stringify(data, null, 2));
        switch (data['header']['service']) {
            case 'chat':
                chat_incoming_msg(data);
                break;
            case 'social':
                go_social(data);
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
    username = document.getElementById("user_id").value;
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

    // Effectuer la requête POST
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

    // Effectuer la requête POST
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

