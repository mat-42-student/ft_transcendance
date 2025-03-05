import { state } from './main.js';
import { initDynamicCard } from "./components/dynamic_card.js";

export function setupHomePage() {}

// Ajouter écouteurs d'événements sur les boutons dans le container des actions -> ?? À compléter avec html profile restant
export function setupProfilePage() {
    const actionsEl = document.getElementById("profile-actions");
    if (!actionsEl) return;

    actionsEl.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !button.dataset.action) return;

        const action = button.dataset.action;
        const userId = button.dataset.userId; // Récupère l'ID de l'utilisateur cible

        handleProfileAction(action, userId);
    });
}

// Logique trop compliquée ? changer pour initDynamicCard en fonction de l'action ?
// Ajouter rechargement page ou changement de hash pour changements après une action ou faire ça dans appels fonctions tierses
// à mettre dans un autre fichier (réagencement prévu)
async function handleProfileAction(action, userId) {
    /*
    Fonction pour gestion des actions depuis #profile (auth || tiers) -> fonctionelle mais incomplète
    */
    const UserUrl = `api/v1/users/${userId}/${action}/`;
    const RelationUrl = `api/v1/users/relationships/${userId}/${action}/`;
    let method;
    let apiUrl;

    if (!action)
        return;
    else if ((action == "add-friend" || action == "remove-friend" || action == "block" || action == "unblock") && (!userId)) {
        console.error("ID utilisateur manquant pour l'action:", action);
        return;
    }

    switch (action) {
        case "logout":
            state.client.logout();
            return;
        case "2fa":
            initDynamicCard('2fa');
            return;
        case "update": // initDynamicCard(update); -> à coder
            return;
        case "match":
            return;
        case "chat":
            return;
        case "add-friend":
            apiUrl = RelationUrl;
            method = "POST";
            break;
        case "remove-friend":
            apiUrl = RelationUrl;
            method = "DELETE";
            break;
        case "block":
            apiUrl = UserUrl;
            method = "POST";
            break;
        case "unblock":
            apiUrl = UserUrl;
            method = "DELETE";
            break;
        default:
        console.warn(`Action inconnue : ${action}`);
        return;
    }

    try {
        const response = await fetch(apiUrl, {
            method: method,
            headers: {
                "Authorization": `Bearer ${state.client.accessToken}`,
                "Content-Type": "application/json"
            },
        });

        if (!response.ok) {
            throw new Error(`Erreur lors de l'exécution de l'action ${action}`);
        }

        console.log(`Action ${action} exécutée avec succès pour l'utilisateur ${userId}`);
    } catch (error) {
        console.error("Erreur API:", error);
    }
}