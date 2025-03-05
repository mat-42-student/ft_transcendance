import { initAuthFormListeners } from './auth_form.js';
import { enroll2fa } from '../api/auth.js';
import { verify2fa } from '../api/auth.js';
// import { state } from '../main.js';
import { handleHashChange } from '../nav.js';


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
	'salonLoad': './partials/cards/salonLoad.html',
};

export async function initDynamicCard(routeKey) {
    const cardContainer = document.getElementById('dynamic-card-container');
    const cardContent = document.getElementById('dynamic-card-content');
    
    // Vérifier si la route existe
    const route = dynamicCardRoutes[routeKey];
    if (!route) {
        console.error(`Aucune route trouvée pour la clé : ${routeKey}`);
        return;
    }

    try {
        // Charger le contenu HTML du fichier correspondant
        const response = await fetch(route);
        if (!response.ok) {
            throw new Error(`Impossible de charger le fichier : ${route}`);
        }
        const content = await response.text();

        // Insérer le contenu dans la carte dynamique
        cardContent.innerHTML = content;

        // Afficher la carte dynamique
        cardContainer.classList.remove('hidden');

        // 2FA
        const twoFactorEnrollButton = document.getElementById('btn-enroll-2fa');
        const twoFactorVerifyButton = document.getElementById('btn-verify-2fa');

        if (twoFactorEnrollButton) {
            twoFactorEnrollButton.addEventListener('click', () => {
                enroll2fa();
            });
        }
    
        if (twoFactorVerifyButton) {
            twoFactorVerifyButton.addEventListener('click', () => {
                verify2fa(); 
            });
        }

        if (routeKey == 'auth') {
            window.location.hash = '#signin'; // Définir hash sur signin par défaut pour l'auth

            // OAuth 2.0
            const oauthButton = document.getElementById('oauth-submit');

            if (oauthButton) {
                oauthButton.addEventListener('click', () => {
                    window.location.href = 'https://localhost:3000/api/v1/auth/oauth/login/';
                });
            }
            
            // Gestion des clics sur les liens
            const authLinks = document.querySelectorAll('#auth-form a[data-action]');
            authLinks.forEach(link => {
                link.addEventListener('click', (event) => {
                    event.preventDefault(); // Empêche la navigation native
                    const action = link.getAttribute('data-action');
                    
                    // Utiliser pushState pour enregistrer l'état dans l'historique
                    history.pushState(action, '', `#${action}`);
                    handleHashChange();
                });
            });

            // Initialiser l'écouteur sur le formulaire d'authentification
            initAuthFormListeners();
        }
        return true;
    } catch (error) {
        console.error(`Erreur lors du chargement de la carte dynamique : ${error.message}`);
    }
}

export function closeDynamicCard() {
    const cardContainer = document.getElementById('dynamic-card-container');
    cardContainer.classList.add('hidden');
    window.history.replaceState({}, '', `#home`);
}
