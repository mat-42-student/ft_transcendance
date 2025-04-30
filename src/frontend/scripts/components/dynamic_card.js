import { state, ft_fetch } from '../main.js';
import { enroll2fa } from '../api/auth.js';
import { verify2fa } from '../api/auth.js';
import { initAuthFormListeners } from './auth_form.js';
import { createRequestItem } from './friend_requests.js';
import { navigator as appNavigator } from '../nav.js';
import { updateProfile } from '../api/users.js';
import { initProfilePage } from '../pages.js';
import { showErrorMessage } from '../utils.js';

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
    'update': './partials/cards/update_profile.html',
};

const cardInitializers = {
    '2fa': () => {
        document.getElementById('btn-enroll-2fa')?.addEventListener('click', enroll2fa);
        document.getElementById('btn-verify-2fa')?.addEventListener('click', verify2fa);
    },
    'auth': () => {
        window.location.hash = '#signin';
        document.getElementById('oauth-submit')?.addEventListener('click', () => {
            localStorage.setItem('cookieSet', true);
            // How do we know if OAuth is denied?
            // Ideally in that case we should localStorage.removeItem('cookieSet');
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

        if (!(await state.client.isAuthenticated())) {
            showErrorMessage("Vous devez vous connecter pour accéder à cette fonctionnalité");
            return closeDynamicCard();
        }

        try {
            if (!state.socialApp)
                throw error

            await state.socialApp.getReceivedRequests();
            requestList.innerHTML = '';

            const requestsArray = Array.from(state.socialApp.friendReceivedRequests.values());

            if (requestsArray.length === 0) {
                requestList.innerHTML = '<li class="no-requests">No pending requests.</li>';
            } else {
                for (const user of requestsArray) {
                    const listItem = await createRequestItem(user);
                    requestList.appendChild(listItem);
                }
            }
        } catch (error) {
            showErrorMessage("SocialApp is not initialized.");
            closeDynamicCard();
        }
    },
    'update': async () => {
        const updateForm = document.getElementById('update-profile-form');

        if (!updateForm) {
            console.error("Update form not found.");
            return;
        }

        // Supprimer les champs password si l'utilisateur est OAuth
        if (state.client.isOauth) {
            const passwordFields = ['password', 'new_password', 'confirm_password'];

            for (const fieldId of passwordFields) {
                const input = document.getElementById(fieldId);
                if (input) {
                    const label = updateForm.querySelector(`label[for="${fieldId}"]`);
                    if (label)
                        label.remove();
                    input.remove();
                }
            }
        }

        updateForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(updateForm);

            // Remove empty fields from FormData
            for (const [key, value] of formData.entries())
                if (!value)
                    formData.delete(key);

            try {
                const response = await updateProfile(formData, state.client.userId);

                if (response) {
                    initProfilePage(state.client.userId);
                    closeDynamicCard();
                } else {
                    displayErrorMessage("Update failed.") // adapter au type d'erreur
                }
            } catch (error) {
                displayErrorMessage("An error occurred during the update.")
                console.error("Error updating profile:", error);
            }
        });
    },
    // Add other specific initializations here
};

export async function initDynamicCard(routeKey) {
    const cardContainer = document.getElementById('dynamic-card-container');
    const cardContent = document.getElementById('dynamic-card-content');
    const cancelButton = document.getElementById('close-dynamic-card');

    if (!dynamicCardRoutes[routeKey])
        return showErrorMessage(`Aucune route trouvée pour la clé '${routeKey}'`);

    if (cancelButton.style.display === 'none')
        cancelButton.style.display = 'inline';

    try {
        const response = await ft_fetch(dynamicCardRoutes[routeKey]);
        if (!response.ok)
            throw error;

        cardContent.innerHTML = await response.text();
        cardContainer.classList.remove('hidden');

        if (cardInitializers[routeKey]) {
            await cardInitializers[routeKey]();
        }
    } catch (error) {
        showErrorMessage("Erreur lors du chargement de la carte dynamique");
        closeDynamicCard();
    }
}

export function closeDynamicCard() {
    const cardContainer = document.getElementById('dynamic-card-container');
    if (cardContainer)
        cardContainer.classList.add('hidden');
    // window.history.replaceState({}, '', `#home`);
}

function displayErrorMessage(message) {
    const updateProfileErrorContainer = document.getElementById('update-profile-error');
    updateProfileErrorContainer.textContent = message;
    updateProfileErrorContainer.classList.remove('hidden');
}

function displaySuccessMessage(message) {
    const updateProfileSuccessContainer = document.getElementById('update-profile-success');
    updateProfileSuccessContainer.textContent = message;
    updateProfileSuccessContainer.classList.remove('hidden');
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
        
//         const response = await ft_fetch(dynamicCardRoutes[routeKey]);
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