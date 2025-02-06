import { handleHashChange, initAuthFormListeners } from './auth_form.js';
import { waitForToken } from '../api/auth.js';
import { enroll2fa } from '../api/auth.js';
import { verify2fa } from '../api/auth.js';
import { handleOAuth } from '../api/auth.js';
import { state } from '../main.js';


const dynamicCardRoutes = {
    'auth': './partials/cards/auth.html',
    'versus': './partials/cards/versus.html',
    'requests': './partials/cards/friend_requests.html',
    'block': './partials/cards/block.html',
    'unblock': './partials/cards/unblock.html',
    '2fa': './partials/cards/2fa.html',
    'oauth': './partials/cards/oauth.html'
};

export function closeDynamicCard() {
    const cardContainer = document.getElementById('dynamic-card-container');
    cardContainer.classList.add('hidden');
    window.history.replaceState({}, '', `#home`);
}

export async function initDynamicCard(routeKey) {
    const cardContainer = document.getElementById('dynamic-card-container');
    const cardContent = document.getElementById('dynamic-card-content');

    // Changer historique de vue hash
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
            // Définir un hash par défaut pour signin
            if (!window.location.hash || window.location.hash === '#auth') {
                window.location.hash = '#signin';
            }

            // OAuth 2.0
            // const oauthButton = document.getElementById('oauth-submit');
            
            // if (oauthButton) {
            //     oauthButton.addEventListener('click', () => {
            //         handleOAuth();
            //     });
            // }

            // OAuth 2.0
            const oauthButton = document.getElementById('oauth-submit');
            if (oauthButton) {
                oauthButton.addEventListener('click', async () => {
                    handleOAuth();
                    try {
                        const token = await waitForToken();
                        state.client.accessToken = token;
                        console.log('Access token loaded into state:', token);
                    } catch (error) {
                        console.error('Failed to load access token in time:', error);
                    }
                });
            }
            



            // async function onDOMContentLoaded() {
            //     console.log("I'm in!");
            //     const params = new URLSearchParams(window.location.search);
            //     const code = params.get('code');
            //     const oauthState = params.get('state'); // Keep state as a string for CSRF if needed
                
            //     if (code && oauthState) {
            //         try {
            //             // Exchange the code for an access token
            //             const callbackUrl = `https://localhost:3000/api/v1/auth/oauth/callback?code=${code}&state=${oauthState}`;
            //             const tokenResponse = await fetch(callbackUrl);
            //             const tokenData = await tokenResponse.json();
                        
            //             if (tokenData.accessToken) {
            //             state.client.accessToken = tokenData.accessToken;
            //             // Remove query parameters from the URL
            //             window.history.replaceState({}, document.title, window.location.pathname);
                    
            //             // Fetch user's info from the OAuth provider
            //             const meResponse = await fetch("https://api.intra.42.fr/v2/me", {
            //                 method: 'GET', // Check if GET is appropriate; some providers might require POST.
            //                 headers: {
            //                 'Authorization': `Bearer ${state.client.accessToken}`
            //                 }
            //             });
            //             const fetchedData = await meResponse.json();
            //             console.log(fetchedData);
                    
            //             const userEmail = fetchedData.email;
            //             if (!userEmail) {
            //                 throw new Error('Email not found in fetched data');
            //             }
                    
            //             // Create the user
            //             const userResponse = await fetch("https://localhost:3000/api/v1/users/register/oauth/", {
            //                 method: 'POST',
            //                 headers: {
            //                     'Content-Type': 'application/json'
            //                 },
            //                 body: JSON.stringify({
            //                     oauth: true,
            //                     email: userEmail
            //                 })
            //             });
            //             const userData = await userResponse.json();
            //             console.log('User registered:', userData);
            //             } else {
            //             console.error("No accessToken returned from backend", tokenData);
            //             }
            //         } catch (error) {
            //             console.error("Error during OAuth flow:", error);
            //         }
            //     }
            // }

            // // Check if DOM is already loaded
            // if (document.readyState === 'loading') {
            //     document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
            // } else {
            //     // DOM is already ready, so run your code directly.
            //     onDOMContentLoaded();
            // }
  
            
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
