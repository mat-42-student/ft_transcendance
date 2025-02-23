import { setupNavigation, navigateTo } from './nav.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { Client } from './Client.js';
import { isAuthenticated } from './api/auth.js';
import { GameBase } from './GameBase.js';
import { Input } from './Input.js';
import { Engine } from './game3d/Engine.js';

export const state = {
    client: new Client(),
    mainSocket: null,
    chatApp: null,
    socialApp: null,
    mmakingApp: null,
    /** @type {GameBase} */ gameApp: null,
    /** @type {Input} */ input: null,
    /** @type {Engine} */ engine: null,
};

// Initialized outside the declaration of the State variable, because
// otherwise the State variable hasn't finished being declared and can't be
// accessed from within these classes.
state.input = new Input();
state.engine = new Engine();

state.client.setState(state);
window.state = state; // for eval purpose

document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('btn-home');
    const profileButton = document.getElementById('btn-profile');
    const refreshButton = document.getElementById('btn-refresh');
    const playButton = document.getElementById('btn-play');
    const closeButton = document.getElementById('close-dynamic-card');
    const requestsButton = document.querySelector('.btn-friend-requests');
    // const friendButtons = document.querySelectorAll('.friend-item');

    setupNavigation();
    navigateTo('#home');

    state.client.refreshSession('#profile');

    if (homeButton) {
        homeButton.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('#home');
        });
    }

    if (profileButton) {
        profileButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (await isAuthenticated() == false) {
                await state.client.refreshSession('#profile');
                if (!(await isAuthenticated())) {
                    initDynamicCard('auth');
                    return;
                }
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
    if (state.gameApp)
        state.gameApp.close();
});


// REVIEW 23/2/2025, commit 074a0d9e0981: This function appears unused. Delete? Move to utils.js?
// wait for n sec
export function delay(n) {
    return new Promise(function(resolve) {
      setTimeout(resolve, n * 1000);
    });
}