import { setupHomePage, setupProfilePage } from "./pages.js";
import { initDynamicCard } from './components/dynamic_card.js';
import { isAuthenticated } from './api/auth.js';

const routes = {
    '#home': './partials/home.html',
    '#profile': './partials/profile.html',
};

export function setupNavigation() {
    window.addEventListener('popstate', (e) => {
        e.preventDefault();
        console.log("popstate enclanché");
        navigateTo(window.location.hash || '#home'); // Navigate to hash or #home if hash isn't valid
    });
}

export async function navigateTo(hash) {
    const mainContent = document.querySelector('.main-content');
    let route = routes[hash];

    if ((!mainContent) || (!route)) return;

    if (hash == '#profile') {
        console.log("hash == profile");
        if (await isAuthenticated() == false) {
            console.log("profile + pas authentifié");
            window.history.replaceState({}, '', `#signin`);
            // hash = '#signin';
            initDynamicCard('auth');
            return;
        } else {
            console.log("profile + authentifié");
            try {
                const response = await fetch(route);
                const html = await response.text();
                document.querySelector('.main-content').innerHTML = html;
            } catch (error) {
                console.error('Error loading page:', error);
                return;
            }
            window.history.replaceState({}, '', hash);
            setupProfilePage();
            return;
        }
    } else if ((hash === '#signin' || hash === '#register') && await isAuthenticated() == true) {
        // window.location.hash = '#profile';
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