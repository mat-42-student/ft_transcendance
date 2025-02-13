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
    gameApp: null
};

state.client.setState(state);

document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('btn-home');
    const profileButton = document.getElementById('btn-profile');
    const refreshButton = document.getElementById('btn-refresh');
    const playButton = document.getElementById('btn-play');
    const requestsButton = document.querySelector('.btn-friend-requests');
    // const friendButtons = document.querySelectorAll('.friend-item');

    setupNavigation();
    navigateTo('#home');

    state.client.refreshSession();

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
    if (refreshButton) {
        refreshButton.addEventListener('click', async (e) => {
            e.preventDefault();
            state.client.globalRender();
        });
    }
    if (playButton) {
        playButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (state.gameApp)
                state.gameApp.launchGameSocket();
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
});

// page unload // necessary ??
window.addEventListener('beforeunload', function(event) {
    if (state.mainSocket && state.mainSocket.socket)
        state.mainSocket.close();
    if (state.gameApp && state.gameApp.socket)
        state.gameApp.close();
});


// wait for n sec
export function delay(n) {
    return new Promise(function(resolve) {
      setTimeout(resolve, n * 1000);
    });
}