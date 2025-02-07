// import { setupHomePage, setupProfilePage } from "./pages.js";
// import { initDynamicCard } from './components/dynamic_card.js';
// import { isAuthenticated } from './api/auth.js';
// import { state } from "./main.js";

// // let mmaking = null;

// const routes = {
//     '#home': './partials/home.html',
//     '#profile': './partials/profile.html',
// };

// export function setupNavigation() {
//     window.addEventListener('popstate', (e) => {
//         e.preventDefault();
//         // console.log("popstate enclanché");
//         navigateTo(window.location.hash || '#home'); // Navigate to hash or #home if hash isn't valid
//     });
// }

// export async function navigateTo(hash) {
//     const mainContent = document.querySelector('.main-content');
//     let route = routes[hash];

//     if ((!mainContent) || (!route)) return;

//     if (hash == '#profile') {
//         // console.log("hash == profile");
//         if (await isAuthenticated() == false) {
//             // console.log("profile + pas authentifié");
//             window.history.replaceState({}, '', `#signin`);
//             // hash = '#signin';
//             initDynamicCard('auth');
//             return;
//         } else {
//             // console.log("profile + authentifié");
//             try {
//                 const response = await fetch(route);
//                 const html = await response.text();
//                 document.querySelector('.main-content').innerHTML = html;
//             } catch (error) {
//                 console.error('Error loading page:', error);
//                 return;
//             }
//             window.history.replaceState({}, '', hash);
//             setupProfilePage();
//             return;
//         }
//     } else if ((hash === '#signin' || hash === '#register') && await isAuthenticated() == true) {
//         hash = '#profile';
//         window.history.replaceState({}, '', hash);
//         setupProfilePage();
//         return;
//     } else {
//         hash = '#home';
//         route = routes[hash];
//         try {
//             const response = await fetch(route);
//             const html = await response.text();
//             document.querySelector('.main-content').innerHTML = html;
// 			// if (client.getmainSocket())
// 			// 	mmaking = new Mmaking(client.getmainSocket().mainSocket);
//         } catch (error) {
//             console.error('Error loading page:', error);
//             return;
//         }
//         window.history.replaceState({}, '', hash);
//         setupHomePage();
//         return;
//     }
// }

import { setupHomePage, setupProfilePage } from "./pages.js";
import { initDynamicCard } from './components/dynamic_card.js';
import { isAuthenticated } from './api/auth.js';
import { state } from "./main.js";

const routes = {
    '#home': './partials/home.html',
    '#profile': './partials/profile.html',
};

export function setupNavigation() {
    window.addEventListener('popstate', (e) => {
        e.preventDefault();
        navigateTo(window.location.hash || '#home');
    });
}

async function updateUserInfo() {
    try {
        await state.client.fetchUserProfile(); // Récupération des infos de l'utilisateur
    } catch (error) {
        console.error('Erreur lors de la mise à jour des informations utilisateur :', error);
    }
}

export async function navigateTo(hash) {
    const mainContent = document.querySelector('.main-content');
    let route = routes[hash];

    if ((!mainContent) || (!route)) return;

    if (hash == '#profile') {
        if (await isAuthenticated() == false) {
            window.history.replaceState({}, '', `#signin`);
            initDynamicCard('auth');
            return;
        } else {
            try {
                const response = await fetch(route);
                const html = await response.text();
                document.querySelector('.main-content').innerHTML = html;
                await updateUserInfo(); // Mise à jour des infos de l'utilisateur après chargement de la page
            } catch (error) {
                console.error('Error loading page:', error);
                return;
            }
            window.history.replaceState({}, '', hash);
            setupProfilePage();
            return;
        }
    } else if ((hash === '#signin' || hash === '#register') && await isAuthenticated() == true) {
        hash = '#profile';
        window.history.replaceState({}, '', hash);
        setupProfilePage();
        return;
    } else {
        hash = '#home';
        route = routes[hash];
        try {
            const response = await fetch(route);
            const html = await response.text();
            document.querySelector('.main-content').innerHTML = html;
        } catch (error) {
            console.error('Error loading page:', error);
            return;
        }
        window.history.replaceState({}, '', hash);
        setupHomePage();
        return;
    }
}
