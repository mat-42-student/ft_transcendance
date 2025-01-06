import { sendWebSocketMessage } from './websocket.js';

export function initChatWithFriend(friendUsername) {
    const chatHeader = document.querySelector('.chat-header .friend-name');
    const chatBody = document.querySelector('.chat-body');
    const chatForm = document.querySelector('.btn-chat');

    // Met à jour l'interface du chat avec le nom d'utilisateur de l'ami
    chatHeader.textContent = friendUsername;
    chatBody.innerHTML = ''; // Efface les messages existants

    // Ajoute un gestionnaire pour envoyer des messages
    chatForm.onsubmit = (event) => {
        event.preventDefault();
        const messageInput = chatForm.querySelector('input');
        const message = messageInput.value.trim();

        if (message) {
            // Envoie le message via WebSocket
            sendWebSocketMessage({
                type: 'chat_message',
                recipient: friendUsername,
                message,
            });

            // Affiche immédiatement le message dans le chat
            displayChatMessage(message, 'Vous');
            messageInput.value = '';
        }
    };
}

export function displayChatMessage(message, sender) {
    const chatBody = document.querySelector('.chat-body');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    messageElement.classList.add(sender === 'Vous' ? 'user-message' : 'friend-message');
    messageElement.textContent = `${sender}: ${message}`;
    chatBody.appendChild(messageElement);

    // Scroll en bas du chat
    chatBody.scrollTop = chatBody.scrollHeight;
}