import { initDynamicCard } from "./components/dynamic_card.js";
import { isAuthenticated, logout } from "./api/auth.js";

export function setupHomePage() {
    // document.querySelectorAll('.btn-versus').forEach(button => {
    //     button.addEventListener('click', () => {
    //         initDynamicCard('versus');
    //     });
    // });
}

export function setupProfilePage() {
    const interval = setInterval(() => {
        const logoutContainer = document.getElementById('logout-container');
        const logoutButton = document.getElementById('btn-logout');

        if (logoutContainer && logoutButton) {
            clearInterval(interval); // Stop checking once the elements are found

            if (isAuthenticated()) {
                logoutContainer.classList.remove('hidden');
            } else {
                logoutContainer.classList.add('hidden');
            }

            logoutButton.addEventListener('click', () => {
                logout();
            });

            document.querySelectorAll('.btn-block').forEach(button => {
                button.addEventListener('click', () => {
                    initDynamicCard('block');
                });
            });

            document.querySelectorAll('.btn-unblock').forEach(button => {
                button.addEventListener('click', () => {
                    initDynamicCard('unblock');
                });
            });

            document.querySelectorAll('.btn-2fa').forEach(button => {
                button.addEventListener('click', () => {
                    initDynamicCard('2fa');
                });
            });
        }
    }, 100); // Retry every 100ms until elements are available
}