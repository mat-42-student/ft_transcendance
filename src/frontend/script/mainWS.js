let mainSocket;

function launchMainSocket() {
    console.log("Joining wss://" + window.location.hostname + ":3000/ws/")
    mainSocket = new WebSocket("wss://" + window.location.hostname + ":3000/ws/");

    mainSocket.onerror = async function(e) {
        console.error(e.message);
    };

    mainSocket.onopen = async function(e) {
        await mainSocket.send(JSON.stringify({
            'dc': 'auth',
            'message' : {
                'user':'toto',
                'pass':'password'
            },
            })
        );
    };

    mainSocket.onclose = async function(e) {
        window.location.hash = "#home.html";
        window.location.hash = "#matchmaking.html";
    };

    mainSocket.onmessage = async function(e) {
        data = JSON.parse(e.data);
        console.log("Incoming data : " + data['message']);
    };
}

launchMainSocket();