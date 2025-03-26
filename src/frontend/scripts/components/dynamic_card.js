import { enroll2fa } from '../api/auth.js';
import { verify2fa } from '../api/auth.js';
import { initAuthFormListeners } from './auth_form.js';
import { createRequestItem } from './friend_requests.js';
import { navigator as appNavigator } from '../nav.js';

const dynamicCardRoutes = {
    'auth': './partials/cards/auth.html',
    'versus': './partials/cards/versus.html',
    'requests': './partials/cards/friend_requests.html',
    'block': './partials/cards/block.html',
    'unblock': './partials/cards/unblock.html',
    '2fa': './partials/cards/2fa.html',
    'vs_active': './partials/cards/vs_active.html',
	'salonHost': './partials/cards/salonHost.html',
	'salonGuest': './partials/cards/salonGuest.html',
	'load': './partials/cards/salonLoad.html',
	'tournament': './partials/cards/tournament.html',
};

const closeDynamicCardHidden = [
    'salonHost',
    'salonGuest',
    'load',
    'versus'
]


/*
    Piste d'exemple pour changement logique de init -> rendre logique spécifique à chaques cards modulaire dans init via un objet
    cardInitializers stock les logiques propores à chaque routes en liste et le renvoie en fonction de la route dans initDynamicCard
    - plus lisible
    - modulaire
    - pas de if/else massif
*/
const cardInitializers = {
    '2fa': () => {
        document.getElementById('btn-enroll-2fa')?.addEventListener('click', enroll2fa);
        document.getElementById('btn-verify-2fa')?.addEventListener('click', verify2fa);
    },
    'auth': () => {
        window.location.hash = '#signin';
        document.getElementById('oauth-submit')?.addEventListener('click', () => {
            localStorage.setItem('cookieSet', true);
            // comment on sait si le OAuth est refusé ? 
            // Idealement dans ce cas on devrait localStorage.removeItem('cookieSet');
            window.location.href = 'https://localhost:3000/api/v1/auth/oauth/login/';
        });
        document.querySelectorAll('#auth-form a[data-action]').forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const action = link.getAttribute('data-action');
                history.pushState(action, '', `#${action}`);
                appNavigator.handleHashChange();
            });
        });
        initAuthFormListeners();
    },
    'requests': async () => {
        const requestList = document.getElementById('requests-list');
        if (!requestList) return;

        try {
            if (!state.socialApp) {
                console.error("state.socialApp n'est pas initialisé");
                return;
            }

            await state.socialApp.getReceivedRequests();
            requestList.innerHTML = '';

            const requestsArray = Array.from(state.socialApp.friendReceivedRequests.values());

            if (requestsArray.length === 0) {
                requestList.innerHTML = '<li class="no-requests">Aucune demande en attente.</li>';
            } else {
                for (const user of requestsArray) {
                    const listItem = await createRequestItem(user);
                    requestList.appendChild(listItem);
                }
            }
        } catch (error) {
            console.error("Erreur lors du chargement des requêtes d'amis :", error);
        }
    }
    // Ajoute d'autres initialisations spécifiques ici
};

export async function initDynamicCard(routeKey) {
    const cardContainer = document.getElementById('dynamic-card-container');
    const cardContent = document.getElementById('dynamic-card-content');

    if (!dynamicCardRoutes[routeKey]) {
        console.error(`Aucune route trouvée pour la clé : ${routeKey}`);
        return;
    }

    try {
        const response = await fetch(dynamicCardRoutes[routeKey]);
        if (!response.ok) throw new Error(`Impossible de charger : ${dynamicCardRoutes[routeKey]}`);

        cardContent.innerHTML = await response.text();
        cardContainer.classList.remove('hidden');

        if (cardInitializers[routeKey]) {
            await cardInitializers[routeKey]();
        }
    } catch (error) {
        console.error("Erreur lors du chargement de la carte dynamique :", error);
    }
}

export function closeDynamicCard() {
    const cardContainer = document.getElementById('dynamic-card-container');
    if (cardContainer)
        cardContainer.classList.add('hidden');
    window.history.replaceState({}, '', `#home`);
}

/*
    Version de base de la fonction optimisée
*/
// export async function initDynamicCard(routeKey) {
//     const cardContainer = document.getElementById('dynamic-card-container');
//     const cardContent = document.getElementById('dynamic-card-content');

//     if (!cardContainer || !cardContent) {
//         console.error("Les éléments dynamiques de la carte sont introuvables.");
//         return;
//     }

//     try {
//         if (!dynamicCardRoutes[routeKey])
//             throw new Error(`Route inconnue : ${routeKey}`);
        
//         const response = await fetch(dynamicCardRoutes[routeKey]);
//         if (!response.ok)
//             throw new Error(`Erreur de chargement : ${response.status} ${response.statusText}`);
        
//         const content = await response.text();
//         if (!content.trim())
//             throw new Error(`Le fichier ${dynamicCardRoutes[routeKey]} est vide.`);

//         cardContent.innerHTML = content;
//         cardContainer.classList.remove('hidden');

//         // Délégation d'événements
//         cardContent.addEventListener("click", (event) => {
//             if (event.target.matches("#btn-enroll-2fa")) {
//                 enroll2fa();
//             } else if (event.target.matches("#btn-verify-2fa")) {
//                 verify2fa();
//             } else if (event.target.matches("#oauth-submit")) {
//                 window.location.href = 'https://localhost:3000/api/v1/auth/oauth/login/';
//             }
//         });

//         if (routeKey === 'auth') {
//             window.location.hash = '#signin';
//             initAuthFormListeners();

//             document.querySelectorAll('#auth-form a[data-action]').forEach(link => {
//                 link.addEventListener('click', (event) => {
//                     event.preventDefault();
//                     const action = link.getAttribute('data-action');
//                     history.pushState(action, '', `#${action}`);
//                     appNavigator.handleHashChange();
//                 });
//             });
//         }
//     } catch (error) {
//         console.error(`Erreur lors du chargement de la carte dynamique :`, error);
//     }
// }