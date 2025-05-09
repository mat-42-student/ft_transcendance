import { state } from "../main.js";
import { closeDynamicCard } from "./dynamic_card.js";
import { getAvatarPath } from "../utils.js";

export function updatePendingCountDisplay() {
    const pendingBadge = document.getElementById('pending-count');
    if (pendingBadge) {
        pendingBadge.textContent = state.socialApp.pendingCount;
        // pendingBadge.style.display = state.socialApp.pendingCount > 0 ? 'inline' : 'none';
    }
}

export function resetPendingCountDisplay() {
    const pendingBadge = document.getElementById('pending-count');
    if (pendingBadge) {
        pendingBadge.textContent = "";
        // pendingBadge.style.display = state.socialApp.pendingCount > 0 ? 'inline' : 'none';
    }
}

export async function createRequestItem(user) {
    const listItem = createElement('li', 'request-item');
    const avatarPath = getAvatarPath(user.avatar);
    const avatar = createElement('img', 'avatar', {
        src: avatarPath,
        alt: `${user.username}'s avatar`
    });
    const username = createElement('span', 'username', {}, user.username);
    const acceptButton = createElement(
        'button',
        'accept-btn',
        {},
        'Accept',
        { click: () => acceptFriendRequest(user.id, listItem) }
    );
    const rejectButton = createElement(
        'button',
        'reject-btn',
        {},
        'Refuse',
        { click: () => rejectFriendRequest(user.id, listItem) }
    );

    listItem.appendChild(avatar);
    listItem.appendChild(username);
    listItem.appendChild(acceptButton);
    listItem.appendChild(rejectButton);

    return listItem;
}

function createElement(tag, className, attributes = {}, innerHTML = '', eventHandlers = {}) {
    const element = document.createElement(tag);
    element.classList.add(className);

    // Ajouter les attributs
    Object.keys(attributes).forEach(key => {
        element.setAttribute(key, attributes[key]);
    });

    // Ajouter le contenu interne (si présent)
    if (innerHTML)
        element.innerHTML = innerHTML;

    // Ajouter les événements
    Object.keys(eventHandlers).forEach(event => {
        element.addEventListener(event, eventHandlers[event]);
    });

    return element;
}

// Accepter une demande d'ami et mettre à jour la liste
async function acceptFriendRequest(userId, listItem) {
    await state.socialApp.acceptFriendRequest(userId);
    listItem.remove();
    state.socialApp.notifyUser(userId);
    state.socialApp.notifyUser(state.client.userId);

    // Fermer la carte s'il n'y a plus d'autres requêtes
    checkIfNoPendingRequests();
}

// Refuser une demande d'ami et mettre à jour la liste
async function rejectFriendRequest(userId, listItem) {
    await state.socialApp.rejectFriendRequest(userId);
    listItem.remove();
    state.socialApp.notifyUser(userId);
    state.socialApp.notifyUser(state.client.userId);

    // Fermer la carte s'il n'y a plus d'autres requêtes
    checkIfNoPendingRequests();
}

// Fonction utilitaire pour fermer la carte si aucune requête restante
function checkIfNoPendingRequests() {
    const container = document.getElementById('requests-list');
    if (container && container.children.length === 0) {
        closeDynamicCard();
    }
}
