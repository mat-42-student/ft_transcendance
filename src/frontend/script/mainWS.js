let mainSocket;

function launchMainSocket(token) {
    console.log("Joining wss://" + window.location.hostname + ":3000/ws/");
    const socketURL = "wss://" + window.location.hostname + ":3000/ws/?access_token=" + token['accessToken'];
    mainSocket = new WebSocket(socketURL);
    mainSocket.onerror = async function(e) {
        console.error(e.message);
    };

    mainSocket.onopen = async function(e) {
        await mainSocket.send(JSON.stringify({
            'header': {
<<<<<<< HEAD
                'service': 'mmaking',
                'dest': 'back',
                'id': '2'
=======
                'service': 'chat',
>>>>>>> origin/dev
            },
            'body': {
                'to':'toto34',
                'message': 'YO !!',
            }
}));
    };

    mainSocket.onclose = async function(e) { 
        console.log("MainWS is disconnected")
    };

    mainSocket.onmessage = async function(e) {
        data = JSON.parse(e.data);
        console.log(JSON.stringify(data, null, 2));
    };
}

function bricol_log() {
    username = document.getElementById("user_id").value;
    if (!username)
        return;
    document.getElementById("user_id").disabled = true;

    create_user(username);
    auth(username);
}

function create_user(username) {
    const data = {
        username: username,
        email: username + "@mail.fr",
        password: "pass"
    };

    // Effectuer la requête POST
    fetch("https://localhost:3000/api/v1/users/register", {
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
    fetch("https://localhost:3000/api/v1/auth/login", {
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

