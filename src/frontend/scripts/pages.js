import { state } from './main.js';
import { initDynamicCard } from "./components/dynamic_card.js";
import { fetchUserProfile } from "./api/users.js";
import { performUserAction } from './api/users.js';

export function initHomePage() {}

export async function initProfilePage(userId) {
    userId = userId || state.client.userId;
    const data = await fetchUserProfile(userId);
    updateProfileUI(data);

    // Une fois les données chargées, on met en place les événements
    setupProfileEventListeners(userId);
}

// status perso -> state.socialapp.mystatus
function updateProfileUI(data) {
    if (!data) {
        document.getElementById("profile-actions").innerHTML = "<p>Impossible de charger le profil.</p>";
        return;
    }

    document.getElementById("profile-username").textContent = data.username;
    document.getElementById("profile-avatar").src = data.avatar;
    // document.getElementById("profile").classList.add(data.status);

    const actionsEl = document.getElementById("profile-actions");
    actionsEl.innerHTML = generateProfileActions(data);

    // Mettre à jour l'historique des parties
    updateGamesHistory(data.last_games);
}

// Fonction pour mettre à jour l'historique des parties
function updateGamesHistory(games) {
    const gamesList = document.getElementById("games-history-list");
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
    resultCell.textContent = game.result === "win" ? "Victoire" : "Défaite";
    row.appendChild(resultCell);

    const playersCell = document.createElement("td");
    playersCell.textContent = game.players.join(" - ");
    row.appendChild(playersCell);

    const scoresCell = document.createElement("td");
    scoresCell.textContent = game.scores.join(" - ");
    row.appendChild(scoresCell);

    const dateCell = document.createElement("td");
    dateCell.textContent = new Date(game.date).toLocaleDateString();
    row.appendChild(dateCell);

    const tournamentCell = document.createElement("td");
    if (game.tournament) {
        tournamentCell.textContent = `Tournoi : ${game.tournament.organizer}`;
    } else {
        tournamentCell.textContent = "Partie normale";
    }
    row.appendChild(tournamentCell);

    return row;
}

// Voir si gestion nécessaire quand user est bloqué && à bloqué
function generateProfileActions(data) {
    if (data.is_self) {
        return `
            <button data-action="2fa" data-user-id="${data.id}" title="Enable Two-Factor Authentication">
                <img src="/ressources/2fa.svg" alt="Enable 2fa">
            </button>
            <button data-action="update" data-user-id="${data.id}" title="Update Profile">
                <img src="/ressources/update.png" alt="Update Profile">
            </button>
            <button data-action="logout" data-user-id="${data.id}" title="Logout">
                <img src="/ressources/logout.png" alt="Logout">
            </button>
        `;
    } else if (data.has_blocked_user) {
        return `<p>Vous avez été mis en sourdine par cet utilisateur.</p>
                <button data-action="match" data-user-id="${data.id}" title="Match">
                    <img src="/ressources/vs.png" alt="Match">
                </button>
                <button data-action="remove-friend" data-user-id="${data.id}" title="Remove Friend">
                    <img src="/ressources/remove-friend.png" alt="Remove Friend">
                </button>
        `;
        
    } else if (data.is_blocked_by_user) {
        return `
            <p>Vous avez mis en sourdine cet utilisateur.</p>
            <button data-action="match" data-user-id="${data.id}" title="Match">
                <img src="/ressources/vs.png" alt="Match">
            </button>
            <button data-action="remove-friend" data-user-id="${data.id}" title="Remove Friend">
                <img src="/ressources/remove-friend.png" alt="Remove Friend">
            </button>
            <button data-action="unblock" data-user-id="${data.id}" title="Unblock">
                <img src="/ressources/unblock.png" alt="Unblock">
            </button>
        `;
    } else if (data.is_friend) {
        return `
            <button data-action="match" data-user-id="${data.id}" title="Match">
                <img src="/ressources/vs.png" alt="Match">
            </button>
            <button data-action="chat" data-user-id="${data.id}" title="Chat">
                <img src="/ressources/chat.png" alt="Chat">
            </button>
            <button data-action="remove-friend" data-user-id="${data.id}" title="Remove Friend">
                <img src="/ressources/remove-friend.png" alt="Remove Friend">
            </button>
            <button data-action="block" data-user-id="${data.id}" title="Block">
                <img src="/ressources/block.png" alt="Block">
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

function setupProfileEventListeners(userId) {
    const actionsEl = document.getElementById("profile-actions");
    if (!actionsEl) return;

    actionsEl.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !button.dataset.action) return;

        handleProfileAction(button.dataset.action, userId);
    });
}

// Ajouter rechargement page ou changement de hash pour changements après une action ou faire ça dans appels fonctions tierses
async function handleProfileAction(action, userId) {
    if (!action) return;

    switch (action) {
        case "logout":
            state.client.logout();
            break;
        case "2fa":
            initDynamicCard('2fa');
            break;
        case "update":
            initDynamicCard('update'); // À implémenter
            break;
        case "match":
        case "chat":
            console.log(`Action ${action} non encore implémentée.`);
            break;
        default:
            if (!userId) {
                console.error("ID utilisateur manquant pour l'action:", action);
                return;
            }
            await performUserAction(userId, action);
            break;
    }
}