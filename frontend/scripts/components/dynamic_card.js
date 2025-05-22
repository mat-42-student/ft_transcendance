import { state, ft_fetch } from '../main.js';
import { enroll2fa } from '../api/auth.js';
import { verify2fa } from '../api/auth.js';
import { disable2fa } from '../api/auth.js';
import { initAuthFormListeners } from './auth_form.js';
import { createRequestItem } from './friend_requests.js';
import { navigator as appNavigator } from '../nav.js';
import { updateProfile } from '../api/users.js';
import { initProfilePage } from '../pages.js';
import { mainErrorMessage } from '../utils.js';
import { validatePassword } from '../api/auth.js'
import { apiRequest } from '../api/users.js';

const dynamicCardRoutes = {
    'auth': './partials/cards/auth.html',
    'versus': './partials/cards/versus.html',
    'requests': './partials/cards/friend_requests.html',
    'block': './partials/cards/block.html',
    'unblock': './partials/cards/unblock.html',
    'enable-2fa': './partials/cards/enable-2fa.html',
    'disable-2fa': './partials/cards/disable-2fa.html',
    'vs_active': './partials/cards/vs_active.html',
	'salonHost': './partials/cards/salonHost.html',
	'salonGuest': './partials/cards/salonGuest.html',
	'load': './partials/cards/salonLoad.html',
	'tournament': './partials/cards/tournament.html',
    'update': './partials/cards/update_profile.html',
    'delete': './partials/cards/delete_profile.html',
};

const cardInitializers = {
    'enable-2fa': () => {
        document.getElementById('btn-enroll-2fa')?.addEventListener('click', enroll2fa);
        document.getElementById('btn-verify-2fa')?.addEventListener('click', verify2fa);
    },
    'disable-2fa': () => {
        document.getElementById('btn-disable-2fa')?.addEventListener('click', disable2fa);
    },
    'auth': () => {
        document.getElementById('oauth-submit')?.addEventListener('click', () => {
            window.location.href = '/api/v1/auth/oauth/login/';
        });
        initAuthFormListeners();
    },
    'requests': async () => {
        const requestList = document.getElementById('requests-list');
        if (!requestList) return;

        if (!(await state.client.isAuthenticated())) {
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
            closeDynamicCard();
        }
    },
    'update': async () => {
        const updateForm = document.getElementById('update-profile-form');

        if (!updateForm)
            return mainErrorMessage("Update form not found.");

        // Remove password update if user is loged in with Oauth
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

        document.getElementById('btn-delete-profile')?.addEventListener('click', () => {
            initDynamicCard('delete');
        });

        updateForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(updateForm);
            
            // Check if password fields exist before trying to access them
            const passwordElement = document.getElementById('password');
            const newPasswordElement = document.getElementById('new_password');
            const confirmPasswordElement = document.getElementById('confirm_password');
            
            // Only process password-related logic if the elements exist
            if (passwordElement && newPasswordElement && confirmPasswordElement) {
              const password = passwordElement.value.trim();
              const new_password = newPasswordElement.value.trim();
              const confirm_password = confirmPasswordElement.value.trim();
              
              // Update formData with trimmed values
              if (password) formData.set('password', password);
              if (new_password) formData.set('new_password', new_password);
              if (confirm_password) formData.set('confirm_password', confirm_password);
              
              // Check password policy only if we have password fields
              if (new_password || confirm_password) {
                if (!password)
                  return displayErrorMessage("You must provide your current password to update it");
                if (!new_password || !confirm_password)
                  return displayErrorMessage("Both password fields must be filled");
                const passwordError = validatePassword(new_password);
                if (passwordError)
                  return displayErrorMessage(passwordError);
                if (new_password !== confirm_password)
                  return displayErrorMessage("Passwords don't match");
              }
            }
            
            // Remove empty fields from FormData
            for (const [key, value] of formData.entries()) {
              if (!value) {
                formData.delete(key);
              }
            }
            
            try {
              const response = await updateProfile(formData, state.client.userId);
              initProfilePage(state.client.userId);
              closeDynamicCard();
            } catch (error) {
              displayErrorMessage(error);
            }
          });
    },
    'delete': () => {
        const form = document.getElementById('delete-profile-form');
        if (!form)
            return mainErrorMessage("Delete form not found.");

        if (state.client.isOauth) {
            const passwordInput = document.getElementById('delete-password');
            const label = form.querySelector(`label[for="password"]`);
            if (label) label.remove();
            if (passwordInput) passwordInput.remove();
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            let body;
            if (!state.client.isOauth) {
                const password = document.getElementById('delete-password')?.value.trim();
                if (!password)
                    return displayErrorMessage("Password is required to delete the profile", 'delete-profile-error');

                body = JSON.stringify({ password });
            } else {
                body = null;
            }

            try {
                await apiRequest(`/api/v1/users/${state.client.userId}/`, 'DELETE', body);
                await state.socialApp.notifyAllFriends();
                state.client.logout();
            } catch (error) {
                displayErrorMessage(error.message || error, 'delete-profile-error');
            }
        });
    }
};

export async function initDynamicCard(routeKey) {
    const cardContainer = document.getElementById('dynamic-card-container');
    const cardContent = document.getElementById('dynamic-card-content');
    const cancelButton = document.getElementById('close-dynamic-card');

    if (!dynamicCardRoutes[routeKey])
        return;

    if (!cancelButton)
        return;

    if (cancelButton.style.display === 'none')
        cancelButton.style.display = 'inline';

    try {
        const response = await ft_fetch(dynamicCardRoutes[routeKey]);
        if (!response.ok)
            throw error;

        if (!cardContent || !cardContainer)
            return;

        cardContent.innerHTML = await response.text();
        cardContainer.classList.remove('hidden');

        if (cardInitializers[routeKey]) {
            await cardInitializers[routeKey]();
        }
    } catch (error) {
        closeDynamicCard();
    }
}

export function closeDynamicCard() {
    const cardContainer = document.getElementById('dynamic-card-container');
    if (cardContainer)
        cardContainer.classList.add('hidden');
    // window.history.replaceState({}, '', `#`);
}

function displayErrorMessage(message) {
    const updateProfileErrorContainer = document.getElementById('update-profile-error');

    if (!updateProfileErrorContainer) {
        return;
    }

    updateProfileErrorContainer.textContent = message;
    updateProfileErrorContainer.classList.remove('hidden');
}

function displaySuccessMessage(message) {
    const updateProfileSuccessContainer = document.getElementById('update-profile-success');

    if (!updateProfileSuccessContainer) {
        return;
    }
    
    updateProfileSuccessContainer.textContent = message;
    updateProfileSuccessContainer.classList.remove('hidden');
}