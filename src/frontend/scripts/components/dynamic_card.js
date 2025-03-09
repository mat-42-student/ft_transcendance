import { initAuthFormListeners } from './auth_form.js';
import { enroll2fa } from '../api/auth.js';
import { verify2fa } from '../api/auth.js';
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
};

export async function initDynamicCard(routeKey) {
    const cardContainer = document.getElementById('dynamic-card-container');
    const cardContent = document.getElementById('dynamic-card-content');

    if (!cardContainer || !cardContent) {
        console.error("Les éléments dynamiques de la carte sont introuvables.");
        return;
    }

    try {
        if (!dynamicCardRoutes[routeKey])
            throw new Error(`Route inconnue : ${routeKey}`);
        
        const response = await fetch(dynamicCardRoutes[routeKey]);
        if (!response.ok)
            throw new Error(`Erreur de chargement : ${response.status} ${response.statusText}`);
        
        const content = await response.text();
        if (!content.trim())
            throw new Error(`Le fichier ${dynamicCardRoutes[routeKey]} est vide.`);

        cardContent.innerHTML = content;
        cardContainer.classList.remove('hidden');

        // Délégation d'événements
        cardContent.addEventListener("click", (event) => {
            if (event.target.matches("#btn-enroll-2fa")) {
                enroll2fa();
            } else if (event.target.matches("#btn-verify-2fa")) {
                verify2fa();
            } else if (event.target.matches("#oauth-submit")) {
                window.location.href = 'https://localhost:3000/api/v1/auth/oauth/login/';
            }
        });

        if (routeKey === 'auth') {
            window.location.hash = '#signin';
            initAuthFormListeners();

            document.querySelectorAll('#auth-form a[data-action]').forEach(link => {
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    const action = link.getAttribute('data-action');
                    history.pushState(action, '', `#${action}`);
                    appNavigator.handleHashChange();
                });
            });
        }
    } catch (error) {
        console.error(`Erreur lors du chargement de la carte dynamique :`, error);
    }
}

export function closeDynamicCard() {
    const cardContainer = document.getElementById('dynamic-card-container');
    if (cardContainer)
        cardContainer.classList.add('hidden');
    window.history.replaceState({}, '', `#home`);
}

/*
    Piste d'exemple pour changement logique de init -> rendre logique spécifique à chaques cards modulaire dans init pour éviter d'allourdir la fonction
    - lisible
    - modulaire
    - pas de if/else massif
*/
// const cardInitializers = {
//     'auth': () => {
//         window.location.hash = '#signin';
//         const oauthButton = document.getElementById('oauth-submit');
//         if (oauthButton) {
//             oauthButton.addEventListener('click', () => {
//                 window.location.href = 'https://localhost:3000/api/v1/auth/oauth/login/';
//             });
//         }
//         const authLinks = document.querySelectorAll('#auth-form a[data-action]');
//         authLinks.forEach(link => {
//             link.addEventListener('click', (event) => {
//                 event.preventDefault();
//                 const action = link.getAttribute('data-action');
//                 history.pushState(action, '', `#${action}`);
//                 navigator.handleHashChange();
//             });
//         });
//         initAuthFormListeners();
//     },
//     '2fa': () => {
//         const enrollBtn = document.getElementById('btn-enroll-2fa');
//         const verifyBtn = document.getElementById('btn-verify-2fa');
//         if (enrollBtn) enrollBtn.addEventListener('click', enroll2fa);
//         if (verifyBtn) verifyBtn.addEventListener('click', verify2fa);
//     },
//     // Ajoute d'autres initialisations spécifiques ici
// };

// export async function initDynamicCard(routeKey) {
//     const cardContainer = document.getElementById('dynamic-card-container');
//     const cardContent = document.getElementById('dynamic-card-content');

//     const route = dynamicCardRoutes[routeKey];
//     if (!route) {
//         console.error(`Aucune route trouvée pour la clé : ${routeKey}`);
//         return;
//     }

//     try {
//         const response = await fetch(route);
//         if (!response.ok) throw new Error(`Impossible de charger le fichier : ${route}`);

//         cardContent.innerHTML = await response.text();
//         cardContainer.classList.remove('hidden');

//         // Exécuter l'initialisation spécifique à la route si elle existe
//         if (cardInitializers[routeKey]) {
//             cardInitializers[routeKey]();
//         }

//         return true;
//     } catch (error) {
//         console.error(`Erreur lors du chargement de la carte dynamique : ${error.message}`);
//     }
// }