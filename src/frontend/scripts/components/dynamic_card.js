import { handleHashChange, initAuthFormListeners } from './auth_form.js';

const dynamicCardRoutes = {
    'auth': './partials/cards/auth.html',
    'versus': './partials/cards/versus.html',
    'requests': './partials/cards/friend_requests.html',
    'block': './partials/cards/block.html',
    'unblock': './partials/cards/unblock.html'
};

export function closeDynamicCard() {
    const cardContainer = document.getElementById('dynamic-card-container');
    cardContainer.classList.add('hidden');
    window.history.replaceState({}, '', `#home`);
}

export async function initDynamicCard(routeKey) {
    const cardContainer = document.getElementById('dynamic-card-container');
    const cardContent = document.getElementById('dynamic-card-content');

    // // Changer historique de vue hash
    // history.pushState({ routeKey }, '', `#${routeKey}`);
    
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

        if (routeKey == 'auth') {
            // Définir un hash par défaut pour signin
            if (!window.location.hash || window.location.hash === '#auth') {
                window.location.hash = '#signin';
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
            window.location.hash = '#signin';
            // Initialiser l'écouteur sur le formulaire d'authentification
            initAuthFormListeners();
        }
    } catch (error) {
        console.error(`Erreur lors du chargement de la carte dynamique : ${error.message}`);
    }
}
