import { state } from './main.js';
import { initDynamicCard } from "./components/dynamic_card.js";
import { fetchUserProfile } from "./api/users.js";
import { performUserAction } from './api/users.js';
import { mainErrorMessage } from './utils.js';
import { getAvatarPath } from './utils.js';

export function initHomePage() {}

export async function initProfilePage(userId) {
    userId = userId || state.client.userId;
    const data = await fetchUserProfile(userId);
    updateProfileUI(data);

    // Une fois les données chargées, on met en place les événements
    setupProfileEventListeners(userId);
}

export function renderFriendProfile(data) {
    const currentHash = window.location.hash;

    if (currentHash.startsWith("#profile")) {
        const match = currentHash.match(/^#profile\/(\d+)$/);
        const userId = match ? match[1] : null;

        if (userId) {
            initProfilePage(userId);
        } else
            initProfilePage();
    }
}

function updateProfileUI(data) {
    if (!data) {
        const actionsEl = document.getElementById("profile-actions");
        if (actionsEl) {
            actionsEl.innerHTML = "<p>Impossible de charger le profil.</p>";
        }
        return;
    }

    const usernameEl = document.getElementById("profile-username");
    const avatarEl = document.getElementById("profile-avatar");
    const actionsEl = document.getElementById("profile-actions");

    if (usernameEl) {
        usernameEl.textContent = data.username;
    }

    if (avatarEl) {
        avatarEl.src = getAvatarPath(data.avatar);
        state.client.userAvatar = getAvatarPath(data.avatar);
    }

    if (actionsEl) {
        actionsEl.innerHTML = generateProfileActions(data);
    }

    updateGamesHistory(data.last_games); // on suppose qu'elle gère déjà ses vérifs
}

// Fonction pour mettre à jour l'historique des parties
function updateGamesHistory(games) {
    const gamesList = document.getElementById("games-history-list");

	if (!gamesList) {
        return;
    }

    gamesList.innerHTML = "";

    if (!games || games.length === 0) {
        gamesList.innerHTML = "<tr><td colspan='5'>Aucune partie récente.</td></tr>";
        return;
    }

    games.forEach((game) => {
        const row = createGameRow(game);
        gamesList.appendChild(row);
    });
}

// Fonction pour créer une ligne de tableau pour chaque partie
function createGameRow(game) {
    const row = document.createElement("tr");

    const resultCell = document.createElement("td");
    resultCell.textContent = game.result;
    row.appendChild(resultCell);

    const playersCell = document.createElement("td");
    const player1 = game.player1 || "Joueur 1";
    const player2 = game.player2 || "Joueur 2";
    playersCell.textContent = `${player1} - ${player2}`;
    row.appendChild(playersCell);

    const scoresCell = document.createElement("td");
    const score1 = game.score_player1 ?? "-";
    const score2 = game.score_player2 ?? "-";
    scoresCell.textContent = `${score1} - ${score2}`;
    row.appendChild(scoresCell);

    const dateCell = document.createElement("td");
    dateCell.textContent = new Date(game.date).toLocaleDateString();
    row.appendChild(dateCell);

    const tournamentCell = document.createElement("td");
    if (game.tournament)
        tournamentCell.textContent = "Tournoi";
    else
        tournamentCell.textContent = "Partie normale";
    row.appendChild(tournamentCell);

    return row;
}

// Voir si gestion nécessaire quand user est bloqué && à bloqué
function generateProfileActions(data) {
    if (data.is_self && state.client.isOauth) {
        return `
            <button data-action="update" data-user-id="${data.id}" title="Update Profile">
                <img src="/ressources/update.png" alt="Update Profile">
            </button>
            <button data-action="logout" data-user-id="${data.id}" title="Logout">
                <img src="/ressources/logout.png" alt="Logout">
            </button>
        `;
    } else if (data.is_self && !state.client.isOauth) {
        const twoFAButtonText = data.is_2fa_enabled ? "Disable 2FA" : "Enable 2FA";
        const twoFAIconPath = data.is_2fa_enabled ? "/ressources/disable2fa.png" : "/ressources/enable2fa.png";
        const twoFAAction = data.is_2fa_enabled ? "disable-2fa" : "enable-2fa";

        return `
            <button id="twofa" data-action="${twoFAAction}" data-user-id="${data.id}" data-2fa-enabled="${data.is_2fa_enabled}" title="${twoFAButtonText}">
                <img src="${twoFAIconPath}" alt="${twoFAButtonText}">
            </button>
            <button data-action="update" data-user-id="${data.id}" title="Update Profile">
                <img src="/ressources/update.png" alt="Update Profile">
            </button>
            <button data-action="logout" data-user-id="${data.id}" title="Logout">
                <img src="/ressources/logout.png" alt="Logout">
            </button>
        `;
    } else if (data.is_friend) {
        return `
            <button data-action="remove-friend" data-user-id="${data.id}" title="Remove Friend">
                <img src="/ressources/remove-friend.png" alt="Remove Friend">
            </button>
        `;
    } else if (data.is_pending) {
        return `
            <button data-action="pending-request" data-user-id="${data.id}" title="Pending Request">
                <img src="/ressources/pending-friend.png" alt="Request Pending">
            </button>
        `;
    } else {
        return `
            <button data-action="add-friend" data-user-id="${data.id}" title="Add Friend">
                <img src="/ressources/add-friend.png" alt="Add a Friend">
            </button>
        `;
    }
}

export async function toggle2faButton() {
        const data = await fetchUserProfile(state.client.userId);

        const twoFAButtonText = data.is_2fa_enabled ? "Disable 2FA" : "Enable 2FA";
        const twoFAIconPath = data.is_2fa_enabled ? "/ressources/disable2fa.png" : "/ressources/enable2fa.png";
        const twoFAAction = data.is_2fa_enabled ? "disable-2fa" : "enable-2fa";
        const twoFAButton = document.getElementById("twofa");

        twoFAButton.innerHTML = `<button data-action="${twoFAAction}" data-user-id="${data.id}" data-2fa-enabled="${data.is_2fa_enabled}" title="${twoFAButtonText}">
            <img src="${twoFAIconPath}" alt="${twoFAButtonText}">
        </button>`
}

function setupProfileEventListeners(userId) {
    const actionsEl = document.getElementById("profile-actions");
    if (!actionsEl) return;

    // Vérifie si l'écouteur est déjà attaché
    if (!actionsEl || actionsEl.dataset.listenerAttached === "true") return;

    actionsEl.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !button.dataset.action) return;

        handleProfileAction(button.dataset.action, userId);
        initProfilePage(userId);
    });

    // Marque que l'écouteur a été attaché
    actionsEl.dataset.listenerAttached = "true";
}

// Ajouter rechargement page ou changement de hash pour changements après une action ou faire ça dans appels fonctions tierses
async function handleProfileAction(action, userId) {
    if (!action) return;

    switch (action) {
        case "logout":
            state.client.logout();
            break;
        case "enable-2fa":
            initDynamicCard('enable-2fa');
            break;
        case "disable-2fa":
            initDynamicCard('disable-2fa');
            break;
        case "update":
            initDynamicCard('update');
            break;
        default:
            if (!userId) {
                return;
            }
            await performUserAction(userId, action);
            break;
    }
}
