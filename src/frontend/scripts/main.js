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
    get isPlaying() { return this.gameApp != null && this.engine != null && this.engine.scene != null; },
    /** @type {Clock} */ clock: null,
};

state.engine.init();
state.clock = new Clock();
// Temporary variable. This is deleted by LevelIdle itself after it is done loading.
window.idleLevel = new LevelIdle();

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
    addClickEvent('btn-profile', handleProfileClick);
    addClickEvent('close-dynamic-card', closeDynamicCard);
    addClickEvent('.btn-friend-requests', () => initDynamicCard('requests'));

    setupSearchInput();
}

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
            const response = await ft_fetch(`/api/v1/users/?search=${query}`);
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

export async function ft_fetch(url, options = {}) {
    // console.log("ft_fetch: ", url, options);
    if (isTokenExpiringSoon())
        await state.client.refreshSession();
    options.headers = {
        ...options.headers,
        Authorization: `Bearer ${state.client.accessToken}`,
    };
    let response = await fetch(url, options);
    if (response.status === 403) {
        await state.client.refreshSession();
        options.headers.Authorization = `Bearer ${state.client.accessToken}`;
        response = await fetch(url, options);
    }
    return response;
}

export function isTokenExpiringSoon() {
    if (!state.client.accessToken) {
        // console.error("Token expired");
        return true;
    }
    const payload = JSON.parse(atob(state.client.accessToken.split('.')[1]));
    // console.log("remaining time in token: ", (payload.exp * 1000 - Date.now()) / 60000, " min");
    return (payload.exp * 1000 - Date.now()) < 30000;
}

// REVIEW 23/2/2025, commit 074a0d9e0981: This function appears unused. Delete? Move to utils.js?
// wait for n sec
export function delay(n) {
    return new Promise(resolve => setTimeout(resolve, n * 1000));
}


// --⬇️-- Header play buttons --⬇️--

const buttonQuit = document.getElementById('btn-quit-game');
const buttonLocalBot = document.getElementById('btn-local-bot');
const buttonLocalVersus = document.getElementById('btn-local-versus');
const buttonVersus = document.getElementById('versus');
const buttonTournament = document.getElementsByClassName('btn-tournament')[0];

/** @param {boolean} showQuit Selects which elements become visible. */
export function toggleHeaderButtons(showQuit) {
    let show = [buttonLocalBot, buttonLocalVersus, buttonVersus, buttonTournament];
    let hide = [buttonQuit];

    if (showQuit)
        [hide, show] = [show, hide];

    hide.forEach((toHide) => {
        toHide.style.display = "none";
    });
    show.forEach((toShow) => {
        toShow.style.display = null;
    });
}
window.toggleHeaderButtons = toggleHeaderButtons;  //debug
toggleHeaderButtons(false);  // hide quit button for the first time

buttonLocalBot.addEventListener('click', () => {
    if (state.gameApp == null)
        state.gameApp = new LocalGame(true);
    toggleHeaderButtons(true);
});

buttonLocalVersus.addEventListener('click', () => {
    if (state.gameApp == null)
        state.gameApp = new LocalGame(false);
    toggleHeaderButtons(true);
});

buttonQuit.addEventListener('click', () => {
    if (state.gameApp != null) {
        state.gameApp.close();
        state.gameApp = null;
    }
    toggleHeaderButtons(false);
});

// --⬆️-- Header play buttons --⬆️--
