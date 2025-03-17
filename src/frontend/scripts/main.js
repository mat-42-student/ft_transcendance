import { navigator } from './nav.js';
import { Client } from './apps/Client.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';

export const state = {
    client: new Client(),
    mainSocket: null,
    chatApp: null,
    socialApp: null,
    mmakingApp: null,
    gameApp: null
};

state.client.setState(state);
window.state = state; // Debugging purpose 

document.addEventListener('DOMContentLoaded', initApp);

// Fonction d'initialisation
async function initApp() {
    // await state.client.refreshSession();  // Attendre que la session soit restaurée
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

// wait for n sec
export function delay(n) {
    return new Promise(resolve => setTimeout(resolve, n * 1000));
}