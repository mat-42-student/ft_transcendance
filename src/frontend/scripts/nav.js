import { setupHomePage, setupProfilePage } from "./pages.js";
import { closeDynamicCard, initDynamicCard } from './components/dynamic_card.js';
import { isAuthenticated } from './api/auth.js';
import { updateAuthForm } from "./components/auth_form.js";
import { state } from "./main.js";

const routes = {
    '#home': './partials/home.html',
    '#profile': './partials/profile.html',
};

export async function handleHashChange() {
    const cardContainer = document.getElementById('dynamic-card-container');
    const hash = window.location.hash;
    const isAuth = await isAuthenticated();
    
    if (hash == '#register' || hash == '#signin') { // si hash pour auth, check si carte activée, si oui update formulaire, sinon init 
        if (isAuth) // redirection vers profile si authentifié
            return navigateTo('#profile');
        
        if (cardContainer.classList == 'hidden')
            return initDynamicCard('auth');

        return updateAuthForm(hash);
    } // Ajouter les cas possibles connus
    
    if ((hash == '#home' || hash == '#profile') && cardContainer.classList != 'hidden') // fermer carte si hash de page
        closeDynamicCard();

    navigateTo(hash);
}

export function setupNavigation() {
    window.addEventListener('popstate', (e) => {
        e.preventDefault();
        console.log("popstate change -> " + window.location.hash);
        handleHashChange(); // handleHashChange() remplace navigateTo() pour une meilleure navigation via l'historique
    });
}

export async function navigateTo(hash) {
    const mainContent = document.querySelector('.main-content');
    let route = routes[hash];

    if (!mainContent) return;

    const isAuth = await isAuthenticated();

    console.log("nativageTo -> " + hash + " && isAuth == " + isAuth); //debug

    if (hash == '#profile') {
        if (isAuth == false) {
            window.history.replaceState({}, '', `#signin`);
            return initDynamicCard('auth');
        }

        try {
            const response = await fetch(route);
            const html = await response.text();
            document.querySelector('.main-content').innerHTML = html;

            await state.client.fetchUserProfile(); // Maj infos utilisateur après chargement de la page
        } catch (error) {
            console.error('Error loading page:', error);
            return;
        }

        window.history.replaceState({}, '', hash);
        setupProfilePage();
        return;
    }
        
    try {
        const response = await fetch(route);
        const html = await response.text();
        mainContent.innerHTML = html;

        if(state.mmakingApp)
            state.mmakingApp.refresh_eventlisteners();

        if (state.gameApp) // for testing purpose, DELETE on branch dev
            state.gameApp.addEventlistener(); // for testing purpose, DELETE on branch dev
    } catch (error) {
        console.error('Error loading page:', error);
        return;
    }
    window.history.replaceState({}, '', hash);
    setupHomePage();
}