import { setupNavigation, navigateTo } from './nav.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { isAuthenticated } from './api/auth.js';
import { fetchFriends } from './api/users.js';

document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('btn-home');
    const profileButton = document.getElementById('btn-profile');
    const requestsButton = document.querySelector('.btn-friend-requests');
    const friendButtons = document.querySelectorAll('.friend-item');

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
            console.log("click on PROFILE btn"); // debug
            e.preventDefault(); // Empêche la navigation par défaut
            if (await isAuthenticated() == false) {
                console.log("initDynamicCard(auth)");
                initDynamicCard('auth');
                return;
            } else {
                console.log("navigateTo(#profile)");
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
    
    friendButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const friendElement = event.target.closest('.friend-item');
            const friendUsername = friendElement.querySelector('.friend-name').textContent.trim();
            initChatWithFriend(friendUsername);
        });
    });
});
