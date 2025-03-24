import { navigator } from './nav.js';
import { Client } from './apps/Client.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { GameBase } from './apps/GameBase.js';
import { Input } from './game3d/Input.js';
import { Engine } from './game3d/Engine.js';
import { Clock } from './Clock.js';
import LevelIdle from './game3d/gameobjects/levels/LevelIdle.js';
import { LocalGame } from './apps/LocalGame.js';

export const state = {
    client: new Client(),
    mainSocket: null,
    chatApp: null,
    socialApp: null,
    mmakingApp: null,
    /** @type {GameBase} */ gameApp: null,
    input: new Input(),
    engine: new Engine(),
    get isPlaying() { return this.gameApp != null && this.gameApp.isPlaying != null; },
    /** @type {Clock} */ clock: null,
};

state.engine.init();
state.clock = new Clock();
state.engine.scene = new LevelIdle();

state.client.setState(state);
window.state = state; // Debugging purpose

document.addEventListener('DOMContentLoaded', initApp);

// Fonction d'initialisation
async function initApp() {
    await state.client.refreshSession();  // Attendre que la session soit restaurée
    navigator.handleHashChange();  // Ensuite seulement, traiter le changement de hash
    setupEventListeners();
}

function setupEventListeners() {
    addClickEvent('btn-home', () => navigator.goToPage('home'));
    addClickEvent('btn-refresh', () => state.client.globalRender());
    addClickEvent('btn-profile', handleProfileClick);
    addClickEvent('btn-play', () => state.gameApp?.launchGameSocket());
    addClickEvent('close-dynamic-card', closeDynamicCard);
    addClickEvent('.btn-friend-requests', () => initDynamicCard('requests'));

    setupSearchInput();
}

if (localStorage.getItem('isCookie'))
    await state.client.refreshSession('#profile');

function addClickEvent(selector, callback) {
    const element = document.getElementById(selector) || document.querySelector(selector);
    if (element) {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            callback(e);
        });
    }
}

async function handleProfileClick(e) {
    e.preventDefault();
    if (!(await state.client.isAuthenticated())) {
        await state.client.refreshSession('#profile');
        if (!(await state.client.isAuthenticated())) {
            initDynamicCard('auth');
            return;
        }
    }
    navigator.goToPage('profile');
}

function setupSearchInput() {
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener("input", async () => {
        const query = searchInput.value.trim();

        if (!query) {
            searchResults.style.display = "none";
            return;
        }

        try {
            const response = await fetch(`/api/v1/users/?search=${query}`);
            const users = await response.json();

            searchResults.innerHTML = "";
            if (users.length > 0) {
                users.slice(0, 5).forEach(user => {
                    const li = document.createElement("li");
                    li.textContent = user.username;
                    li.addEventListener("click", () => {
                        searchInput.value = user.username;
                        searchResults.innerHTML = "";
                        searchResults.style.display = "none";
                        navigator.goToPage('profile', user.id)
                    });
                    searchResults.appendChild(li);
                });

                searchResults.style.display = "block";
            } else {
                searchResults.style.display = "none";
            }
        } catch (error) {
            console.error("Erreur lors de la recherche :", error);
        }
    });

    document.addEventListener("click", (event) => {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.innerHTML = "";
            searchResults.style.display = "none";
        }
    });
}

// page unload // necessary ??
window.addEventListener('beforeunload', function() {
    state.mainSocket?.close();
    state.gameApp?.socket?.close();
});

// window.addEventListener('beforeunload', function(event) {
//     if (state.mainSocket && state.mainSocket.socket)
//         state.mainSocket.close();
//     if (state.gameApp)
//         state.gameApp.close();
// });


// REVIEW 23/2/2025, commit 074a0d9e0981: This function appears unused. Delete? Move to utils.js?
// wait for n sec
export function delay(n) {
    return new Promise(resolve => setTimeout(resolve, n * 1000));
}


// Bind local game button (vs AI)
{
    const button = document.getElementById('btn-local-bot');
    button.addEventListener('click', () => {
        if (state.gameApp != null) {
            console.warn('Already playing, ignoring');  //TODO do this more nicely maybe
            return;
        }

        state.gameApp = new LocalGame(true);
    });
}

// Bind local game button (2 keyboard players)
{
    const button = document.getElementById('btn-local-versus');
    button.addEventListener('click', () => {
        if (state.gameApp != null) {
            console.warn('Already playing, ignoring');  //TODO do this more nicely maybe
            return;
        }

        state.gameApp = new LocalGame(false);
    });
}
