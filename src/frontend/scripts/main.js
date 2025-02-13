import { setupNavigation, navigateTo } from './nav.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { Client } from './Client.js';
// import { isAuthenticated } from './api/auth.js';

export const state = {
    client: new Client(),
    mainSocket: null,
    chatApp: null,
    socialApp: null,
    mmakingApp: null,
    // gameSocket = null
};

state.client.setState(state);

document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('btn-home');
    const profileButton = document.getElementById('btn-profile');
    const closeButton = document.getElementById('close-dynamic-card');
    const requestsButton = document.querySelector('.btn-friend-requests');
    // const friendButtons = document.querySelectorAll('.friend-item');

    console.log("setupNavigation()"); //debug
    setupNavigation();

    console.log("naviagteTo(#home)"); //debug
    navigateTo('#home');

    if (homeButton) {
        homeButton.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('#home');
        });
    }

    if (profileButton) {
        profileButton.addEventListener('click', async (e) => {
            e.preventDefault();
            navigateTo('#profile');
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', closeDynamicCard);
    }

    if (requestsButton) {
        requestsButton.addEventListener('click', () => {
            initDynamicCard('requests');
        });
    }
});

// wait for n sec
export function delay(n) {
    return new Promise(function(resolve) {
      setTimeout(resolve, n * 1000);
    });
}