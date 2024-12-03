let mainSocket;

function launchMainSocket() {
    console.log("Joining wss://" + window.location.hostname + ":3000/ws/")
    mainSocket = new WebSocket("wss://" + window.location.hostname + ":3000/ws/");

    mainSocket.onerror = async function(e) {
        console.error(e.message);
    };

    mainSocket.onopen = async function(e) {
        await mainSocket.send(JSON.stringify({
            'header': {
                'from': 'client',
                'to': 'chat',
                'id': 'pikachu666'
            },
            'body': {
                'to':'Philou',
                'message': 'YO !!',
            }
        }));
    };

    mainSocket.onclose = async function(e) { 
        console.log("MainWS is disconnected")
    };

    mainSocket.onmessage = async function(e) {
        data = JSON.parse(e.data);
        console.log("Incoming data : " + data['body']['message']);
    };
}

launchMainSocket();