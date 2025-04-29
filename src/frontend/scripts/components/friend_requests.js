import { state } from "../main.js";

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

// Création de l'élément <li> pour chaque utilisateur
export async function createRequestItem(user) {
    const listItem = createElement('li', 'request-item');

    // Créer l'avatar
    const avatar = createElement('img', 'avatar', { src: `/media/avatars/${user.avatar}`, alt: `${user.username}'s avatar` });

    // Créer le nom d'utilisateur
    const username = createElement('span', 'username', {}, user.username);

    // Créer les boutons Accepter et Refuser
    const acceptButton = createElement('button', 'accept-btn', {}, 'Accepter', { click: () => acceptFriendRequest(user.id, listItem) });
    const rejectButton = createElement('button', 'reject-btn', {}, 'Refuser', { click: () => rejectFriendRequest(user.id, listItem) });

    // Ajouter les éléments à listItem
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
    await state.socialApp.acceptFriendRequest(userId);  // Fonction de la logique de backend pour accepter
    listItem.remove();  // Retirer l'élément de la liste
    state.socialApp.notifyUser(userId);
    state.socialApp.notifyUser(state.client.userId);
}

// Refuser une demande d'ami et mettre à jour la liste
async function rejectFriendRequest(userId, listItem) {
    await state.socialApp.rejectFriendRequest(userId);  // Fonction de la logique de backend pour refuser
    listItem.remove();  // Retirer l'élément de la liste
    console.log("Demande d'ami refusée pour l'utilisateur:", userId);
    state.socialApp.notifyUser(userId);
    state.socialApp.notifyUser(state.client.userId);
    // state.socialApp.getPendingCount();
}