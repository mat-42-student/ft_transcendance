import { initDynamicCard } from "./components/dynamic_card.js";
import { isAuthenticated } from "./api/auth.js";
import { state } from './main.js';

export function setupHomePage() {
    // document.querySelectorAll('.btn-versus').forEach(button => {
    //     button.addEventListener('click', () => {
    //         initDynamicCard('versus');
    //     });
    // });
}

// Nouvelle fonction pour gestion des actions depuis #profile (auth || tiers) -> fonctionelle mais incomplète
// Logique trop compliquée ? changer pour initDynamicCard en fonction de l'action ?
// Ajouter rechargement page ou changement de hash pour changements après une action ou faire ça dans appels fonctions tierses
// à mettre dans un autre fichier (réagencement prévu)
async function handleProfileAction(action, userId) {
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

// export function setupProfilePage() {
//     const interval = setInterval(() => {
//         const logoutContainer = document.getElementById('logout-container');
//         const logoutButton = document.getElementById('btn-logout');

//         if (logoutContainer && logoutButton) {
//             clearInterval(interval); // Stop checking once the elements are found

//             if (isAuthenticated()) {
//                 logoutContainer.classList.remove('hidden');
//             } else {
//                 logoutContainer.classList.add('hidden');
//             }

//             logoutButton.addEventListener('click', () => {
//                 state.client.logout();
//             });

//             document.querySelectorAll('.btn-block').forEach(button => {
//                 button.addEventListener('click', () => {
//                     initDynamicCard('block');
//                 });
//             });

//             document.querySelectorAll('.btn-unblock').forEach(button => {
//                 button.addEventListener('click', () => {
//                     initDynamicCard('unblock');
//                 });
//             });

//             document.querySelectorAll('.btn-2fa').forEach(button => {
//                 button.addEventListener('click', () => {
//                     initDynamicCard('2fa');
//                 });
//             });
//         }
//     }, 100); // Retry every 100ms until elements are available
// }