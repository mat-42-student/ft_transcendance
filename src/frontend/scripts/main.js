import { navigator } from './nav.js';
import { Client } from './apps/Client.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { GameBase } from './apps/GameBase.js';
import { Input } from './game3d/Input.js';
import { Engine } from './game3d/Engine.js';
import LevelIdle from './game3d/gameobjects/levels/idle/LevelIdle.js';
import { LocalGame } from './apps/LocalGame.js';

// Optionally can be enabled for debugging
// if (!localStorage.getItem("keepLogs")) {
//     console.log = () => {};
//     console.warn = () => {};
//     console.error = () => {};
// }

export const state = {
    client: new Client(),
    mainSocket: null,
    chatApp: null,
    socialApp: null,
    mmakingApp: null,
    /** @type {GameBase} */ gameApp: null,
    input: new Input(),
    engine: new Engine(),
    levelLoadingTempStorage: null,
    get isPlaying() { return this.gameApp != null && this.engine != null && this.engine.scene != null; },
};

/** Engine keeps checking if it got stuck without a scene.
 * For a very brief moment, Engine exists but LevelIdle hasnt started loading yet.
 * This would make Engine show an error screen, and attempt to reload the scene.
 * The fix is this variable, that makes Engine be patient. */
state.waitpleasedontfreakout = true;
await state.engine.init();
// Temporary variable. This is deleted by LevelIdle itself after it is done loading.
state.levelLoadingTempStorage = new LevelIdle();
state.waitpleasedontfreakout = undefined;

state.client.setState(state);
window.state = state; // Debugging purpose

// this used to respond to DOMContentLoaded. But now, engine.init is async.
// This means DOMContentLoaded would never fire this function (the event had happened before
// it was registered on this line.)
await initApp();

// Fonction d'initialisation
async function initApp() {
    await state.client.refreshSession();  // Attendre que la session soit restaurée
    navigator.handleHashChange();  // Ensuite seulement, traiter le changement de hash
    setupEventListeners();
}

function setupEventListeners() {
    addClickEvent('btn-home', () => navigator.goToPage(''));
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

function searchFormListener(event) {
    event.preventDefault(); // J'aimerais bien que ca fasse comme un click (sur un li des suggestions des users)
                            // mais les fonctions fléchées c'est pas très modulaire (je pense que la fonction intéressante est celle
                            // de  la ligne 101 ?). Sinon faisons juste rien...
}

function setupSearchInput() {
    const searchForm = document.getElementById('search-form');;
    searchForm.addEventListener('submit', searchFormListener);

    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    // Création de l'alerte flottante
    const alertBox = document.createElement("div");
    alertBox.style.position = "absolute";
    alertBox.style.backgroundColor = "#fff";
    alertBox.style.border = "1px solid #ccc";
    alertBox.style.borderRadius = "5px";
    alertBox.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
    alertBox.style.padding = "8px 12px";
    alertBox.style.color = "#d00";
    alertBox.style.fontSize = "0.9em";
    alertBox.style.display = "none";
    alertBox.style.zIndex = "1000";

    document.body.appendChild(alertBox);

    // Gestion de la recherche au clavier
    searchInput.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
            event.preventDefault();

            if (!(await state.client.isAuthenticated()))
                return showAlert(`Vous devez vous connecter pour accéder à cette fonctionnalité`);
            const query = searchInput.value.trim();

            if (!query) return;

            try {
                const response = await ft_fetch(`/api/v1/users/?search=${query}`);
                const users = await response.json();

                if (users.length > 0) {
                    navigator.goToPage('profile', users[0].id);
                    searchInput.value = "";
                    alertBox.style.display = "none";
                } else {
                    showAlert(`Aucun utilisateur trouvé avec le nom "${query}".`);
                }
            } catch (error) {
                console.error("Erreur lors de la recherche :", error);
                showAlert("Erreur lors de la recherche.");
            }
        }
    });

    function showAlert(message) {
        alertBox.textContent = message;

        const inputRect = searchInput.getBoundingClientRect();
        alertBox.style.top = `${inputRect.bottom + window.scrollY + 5}px`;
        alertBox.style.left = `${inputRect.left + window.scrollX}px`;
        alertBox.style.minWidth = `${inputRect.width}px`;

        alertBox.style.display = "block";

        setTimeout(() => {
            alertBox.style.display = "none";
        }, 3000);
    }
}

// page unload
window.addEventListener('unload', function() {
    state.mainSocket?.close();
    state.gameApp?.close();
    state.engine.scene = null;
});

export async function ft_fetch(url, options = {}) {
    if (isTokenExpiringSoon())
        await state.client.refreshSession();
    options.headers = {
        ...options.headers,
        Authorization: `Bearer ${state.client.accessToken}`,
    };
    try {
        let response = await fetch(url, options);
        return response;
    } catch (error) {
        // console.error("Fetch error:", error);
        // throw error;
    }
}

export function isTokenExpiringSoon() {
    if (!state.client.accessToken)
        return true;
    const payload = JSON.parse(atob(state.client.accessToken.split('.')[1]));
    return (payload.exp * 1000 - Date.now()) < 60000; // 60 sec
}

// wait for n sec
export function delay(n) {
    return new Promise(resolve => setTimeout(resolve, n * 1000));
}

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export function deleteCookie(name, path = '/') {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

// --⬇️-- Header play buttons --⬇️--

const buttonQuit = document.getElementById('btn-quit-game');
const buttonLocalBot = document.getElementById('btn-local-bot');
const buttonLocalVersus = document.getElementById('btn-local-versus');
const buttonLocalSisyphus = document.getElementById('btn-local-sisyphus');
const buttonVersus = document.getElementById('versus');
const buttonTournament = document.getElementsByClassName('btn-tournament')[0];

/** @param {boolean} isInGame Selects which header become visible. */
export function selectVisibleHeader(isInGame = false) {
    let show = document.getElementById("header-notplaying");
    let hide = document.getElementById("header-ingame");

    if (isInGame)
        [hide, show] = [show, hide];

    hide.style.display = "none";
    show.style.display = null;
}
window.toggleHeaderButtons = selectVisibleHeader;  //debug
selectVisibleHeader(false);  // hide quit button for the first time

buttonLocalBot.addEventListener('click', async () => {
    if (state.gameApp == null) {
        await navigator.goToPage('');
        state.gameApp = new LocalGame(true, false);
    }
    selectVisibleHeader(true);
});

buttonLocalVersus.addEventListener('click', async () => {
    if (state.gameApp == null) {
        await navigator.goToPage('');
        state.gameApp = new LocalGame(false, false);
    }
    selectVisibleHeader(true);
});

buttonLocalSisyphus.addEventListener('click', async () => {
    if (state.gameApp == null) {
        await navigator.goToPage('');
        state.gameApp = new LocalGame(true, true);
    }
    selectVisibleHeader(true);
});

buttonQuit.addEventListener('click', () => {
    if (state.gameApp != null) {
        state.gameApp.close(true);
        state.gameApp = null;
    }
    selectVisibleHeader(false);
});

// --⬆️-- Header play buttons --⬆️--
