import { setupHomePage, setupProfilePage } from "./pages.js";
import { closeDynamicCard, initDynamicCard } from './components/dynamic_card.js';
import { isAuthenticated } from './api/auth.js';
import { updateAuthForm } from "./components/auth_form.js";
import { state } from "./main.js";

export async function handleHashChange() {
    const cardContainer = document.getElementById('dynamic-card-container');
    const hash = window.location.hash;
    const isAuth = await isAuthenticated();
    
    if (hash == '#register' || hash == '#signin') { // si hash pour auth, check si carte activée, si oui update formulaire, sinon init 
        if (isAuth) // redirection vers profile si authentifié
            return goProfile();
        
        if (cardContainer.classList == 'hidden')
            initDynamicCard('auth');
        return updateAuthForm(hash);
    } // Ajouter les cas possibles connus
    
    if (cardContainer.classList != 'hidden') { // fermer carte si hash de page
        closeDynamicCard();
        if (hash == '#home')
            return goHome();
        if (hash == '#profile')
            return goProfile();
    }
    return;
}

export function setupNavigation() {
    window.addEventListener('popstate', (e) => {
        e.preventDefault();
        handleHashChange(); // handleHashChange() remplace navigateTo() pour une meilleure navigation via l'historique
    });
}

// remplace navigateTo() pour la partie #home
export async function goHome() {
    const mainContent = document.querySelector('.main-content');

    if (!mainContent) return;

    try {
        const response = await fetch('./partials/home.html');
        const html = await response.text();
        document.querySelector('.main-content').innerHTML = html;

        window.history.replaceState({}, '', `#home`);
        setupHomePage();
        if(state.mmakingApp)
            state.mmakingApp.refresh_eventlisteners();
    } catch (error) {
        console.error('Error loading page:', error);
        return;
    }
    return;
}

// remplace navigateTo() pour la partie #profile -> plus simple, gère auth & nouvel affichage #profile -> fonctionne avec ou sans argument
export async function goProfile(userId) {
    const mainContent = document.querySelector('.main-content');

    if (!mainContent) return;
    const isAuth = await isAuthenticated();

    if (!isAuth) {
        window.history.replaceState({}, '', `#signin`);
        return initDynamicCard('auth');
    }

    try {
        const response = await fetch('./partials/profile.html');
        const html = await response.text();
        document.querySelector('.main-content').innerHTML = html;

        // Attendre que le DOM ait bien pris en compte les changements
        requestAnimationFrame(() => state.client.loadUserProfile(userId));
        setupProfilePage();
        window.history.replaceState({}, '', `#profile`);
    } catch (error) {
        console.error('Error loading page:', error);
        return;
    }
    return;
}

// const routes = {
//     '#home': './partials/home.html',
//     '#profile': './partials/profile.html',
// };

// export async function navigateTo(hash) {
//     const mainContent = document.querySelector('.main-content');
//     let route = routes[hash];

//     if (!mainContent) return;

//     const isAuth = await isAuthenticated();

//     if (hash == '#profile') {
//         if (isAuth == false) {
//             window.history.replaceState({}, '', `#signin`);
//             return initDynamicCard('auth');
//         }

//         try {
//             const response = await fetch(route);
//             const html = await response.text();
//             document.querySelector('.main-content').innerHTML = html;

//             await state.client.fetchUserProfile(); // Maj infos utilisateur après chargement de la page
//         } catch (error) {
//             console.error('Error loading page:', error);
//             return;
//         }

//         window.history.replaceState({}, '', hash);
//         setupProfilePage();
//         return;
//     }
        
//     try {
//         const response = await fetch(route);
//         const html = await response.text();
//         mainContent.innerHTML = html;

//         if(state.mmakingApp)
//             state.mmakingApp.refresh_eventlisteners();

//         if (state.gameApp) // for testing purpose, DELETE on branch dev
//             state.gameApp.addEventlistener(); // for testing purpose, DELETE on branch dev
//     } catch (error) {
//         console.error('Error loading page:', error);
//         return;
//     }
//     window.history.replaceState({}, '', hash);
//     setupHomePage();
// }