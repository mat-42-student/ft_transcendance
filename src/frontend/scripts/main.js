import { setupNavigation, navigateTo } from './nav.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { isAuthenticated } from './api/auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('btn-home');
    const profileButton = document.getElementById('btn-profile');
    const requestsButton = document.querySelector('.btn-friend-requests');

    // Initial setup
    setupNavigation();
    navigateTo('#home');

    // Event listeners for header buttons
    if (homeButton) {
        homeButton.addEventListener('click', () => {
            navigateTo('#home');
        });
    }
    if (profileButton) {
        profileButton.addEventListener('click', async (e) => {
            e.preventDefault(); // Empêche la navigation par défaut
            if (await isAuthenticated() == false) {
                initDynamicCard('auth');
                return;
            } else {
                navigateTo('#profile');
            }
        });
    }

    // Event listener for closing the dynamic card
    const closeButton = document.getElementById('close-dynamic-card');
    if (closeButton) {
        closeButton.addEventListener('click', closeDynamicCard);
    }

    // Event listeners for cards
    if (requestsButton) {
        requestsButton.addEventListener('click', () => {
            initDynamicCard('requests');
        });
    }
});

// Nom des tokens

// accessToken
// refreshToken