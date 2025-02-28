import { setupNavigation, goHome, goProfile } from './nav.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { Client } from './Client.js';
import { isAuthenticated } from './api/auth.js';

export const state = {
    client: new Client(),
    mainSocket: null,
    chatApp: null,
    socialApp: null,
    mmakingApp: null,
    gameApp: null
};

state.client.setState(state);
window.state = state; // for eval purpose

document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('btn-home');
    const profileButton = document.getElementById('btn-profile');
    const refreshButton = document.getElementById('btn-refresh');
    const playButton = document.getElementById('btn-play');
    const closeButton = document.getElementById('close-dynamic-card');
    const requestsButton = document.querySelector('.btn-friend-requests');
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    // const friendButtons = document.querySelectorAll('.friend-item'); // -> nécessite auth pour récup items + comment récup id depuis `friend-item` ??
    let lastQuery = "";

    setupNavigation();
    goHome();

    state.client.refreshSession('#profile');

    if (homeButton) {
        homeButton.addEventListener('click', (e) => {
            e.preventDefault();
            goHome();
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
                goProfile();
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

    if (searchInput) {
        searchInput.addEventListener("input", async () => {
            const query = searchInput.value.trim();
            // let timeout = null;
    
            // clearTimeout(timeout);

            if (query.length === 0) {
                searchResults.style.display = "none";
                return;
            }
    
            // if (query.length === 0) {
            //     searchResults.innerHTML = "";
            //     lastQuery = "";
            //     return;
            // }
    
            // Vérifie si la nouvelle entrée prolonge la précédente pour éviter des requêtes inutiles
            // if (!query.startsWith(lastQuery)) {
            //     searchResults.innerHTML = ""; // Réinitialise les résultats si un caractère est supprimé
            // }
            // lastQuery = query;

            try {
                const response = await fetch(`/api/v1/users/?search=${query}`);
                const users = await response.json();
            
                // Réinitialiser la liste des résultats
                searchResults.innerHTML = "";
            
                if (users.length > 0) {
                    users.slice(0, 5).forEach(user => {
                        const li = document.createElement("li");
                        li.textContent = user.username;
            
                        li.addEventListener("click", () => {
                            searchInput.value = user.username;
                            searchResults.innerHTML = "";
                            searchResults.style.display = "none"; // Cacher après sélection
                            goProfile(user.id);
                        });
            
                        searchResults.appendChild(li);
                    });
            
                    searchResults.style.display = "block"; // Afficher les résultats
                } else {
                    searchResults.style.display = "none"; // Cacher si aucun résultat
                }
            } catch (error) {
                console.error("Erreur lors de la recherche :", error);
            }
    
            // timeout = setTimeout(() => {
            //     fetch(`/api/v1/users/?search=${encodeURIComponent(query)}`)
            //         .then(response => response.json())
            //         .then(data => {
            //             searchResults.innerHTML = "";
    
            //             if (data.length === 0) {
            //                 searchResults.innerHTML = "<li>Aucun résultat</li>";
            //                 return;
            //             }
    
            //             data.forEach(user => {
            //                 const li = document.createElement("li");
            //                 li.textContent = user.username;
            //                 li.addEventListener("click", () => {
            //                     searchInput.value = user.username;
            //                     searchResults.innerHTML = "";
            //                 });
            //                 searchResults.appendChild(li);
            //             });
            //         })
            //         .catch(error => console.error("Erreur de recherche:", error));
            // }, 300); // Debounce de 300ms
        });
    }

    // searchInput.addEventListener("input", async () => {
    //     const query = searchInput.value.trim();
    //     if (query.length === 0) {
    //         searchResults.style.display = "none";
    //         return;
    //     }
    
        // try {
        //     const response = await fetch(`/api/v1/users/?search=${query}`);
        //     const users = await response.json();
    
        //     if (users.length > 0) {
        //         searchResults.innerHTML = users
        //             .slice(0, 5)
        //             .map(user => `<div class="search-item">${user.username}</div>`)
        //             .join("");
        //         searchResults.style.display = "block";
        //     } else {
        //         searchResults.style.display = "none";
        //     }
        // } catch (error) {
        //     console.error("Erreur lors de la recherche :", error);
        // }
    // });

    document.addEventListener("click", (event) => {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.innerHTML = "";
        }
    });
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