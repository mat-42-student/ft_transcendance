import { setupNavigation, navigateTo } from './nav.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { isAuthenticated } from './api/auth.js';
import { Client } from './Client.js';

export const state = {
    client: new Client(),
    mainSocket: null,
    chatApp: null,
    socialApp: null,
    mmakingApp: null,
    // gameSocket = null
  };
  
document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('btn-home');
    const profileButton = document.getElementById('btn-profile');
    const requestsButton = document.querySelector('.btn-friend-requests');
    const friendButtons = document.querySelectorAll('.friend-item');

    setupNavigation();
    navigateTo('#home');

    if (homeButton) {
        homeButton.addEventListener('click', () => {
            navigateTo('#home');
        });
    }
    if (profileButton) {
        profileButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (await isAuthenticated() == false) {
                initDynamicCard('auth');
                return;
            } else {
                navigateTo('#profile');
            }
        });
    }
    const closeButton = document.getElementById('close-dynamic-card');
    if (closeButton) {
        closeButton.addEventListener('click', closeDynamicCard);
    }
    if (requestsButton) {
        requestsButton.addEventListener('click', () => {
            initDynamicCard('requests');
        });
    }
    // friendButtons.forEach((button) => {
    //     button.addEventListener('click', (event) => {
    //         const friendElement = event.target.closest('.friend-item');
    //         const friendUsername = friendElement.querySelector('.friend-name').textContent.trim();
    //         initChatWithFriend(friendUsername);
    //     });
    // });
});