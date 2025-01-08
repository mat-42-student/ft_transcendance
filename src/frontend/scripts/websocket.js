let websocket = null;

export function openWebSocket() {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        console.error("Impossible d'ouvrir un WebSocket : utilisateur non authentifié.");
        return;
    }

    websocket = new WebSocket(`ws://${window.location.host}/ws/chat/`);

    websocket.onopen = () => {
        console.log("Connexion WebSocket établie.");
    };

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Message reçu via WebSocket :", data);

        // Handle different message types (e.g., new chat messages)
        if (data.type === 'chat_message') {
            displayChatMessage(data.message, data.sender);
        }
    };

    websocket.onclose = () => {
        console.log("Connexion WebSocket fermée.");
    };

    websocket.onerror = (error) => {
        console.error("Erreur WebSocket :", error);
    };
}

export function sendWebSocketMessage(message) {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket non connecté.");
        return;
    }

    websocket.send(JSON.stringify(message));
}