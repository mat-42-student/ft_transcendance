import { state } from '../main.js';
import { ft_fetch } from '../main.js';
import { initProfilePage } from '../pages.js';

const apiBase = '/api/v1/users';

export async function apiRequest(endpoint, method = 'GET', body = null) {
    if (!state.client.accessToken) {
        console.error("User is not connected");
        return;
    }
    try {
        const headers = {
            'Authorization': `Bearer ${state.client.accessToken}`,
        };

        // Ajouter l'en-tête Content-Type uniquement si ce n'est pas un FormData
        if (!(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await ft_fetch(endpoint, {
            method: method,
            headers: headers,
            body: body instanceof FormData ? body : (body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null),
        });

        if (!response.ok) {
            throw new Error(`API Error (${response.status}): ${await response.text()}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

export async function updateProfile(formData, userId) {
    try {
        const response = await apiRequest(`${apiBase}/${userId}/`, 'PATCH', formData);
        return response;
    } catch (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        return null;
    }
}

export async function fetchUserProfile(userId) {
    return await apiRequest(`/api/v1/users/${userId}/profile/`);
}

export async function fetchFriends(userId) {
    try {
        const data = await apiRequest(`${apiBase}/${userId}/friends/`, 'GET');
        return data?.friends ?? [];
    } catch (error) {
        console.error('Erreur lors du chargement des amis:', error);
        return [];
    }
}

export async function fetchReceivedRequests() {
    try {
        const data = await apiRequest(`${apiBase}/relationships/received-requests/`, 'GET');
        return data?.received_requests ?? [];
    } catch (error) {
        console.error('Erreur lors du chargement des demandes reçues:', error);
        return [];
    }
}

export async function fetchSentRequests() {
    try {
        const data = await apiRequest(`${apiBase}/relationships/sent-requests/`, 'GET');
        return data?.sent_requests ?? [];
    } catch (error) {
        console.error('Erreur lors du chargement des demandes envoyées:', error);
        return [];
    }
}

export async function fetchPendingCount() {
    try {
        const data = await apiRequest(`${apiBase}/relationships/pending-count/`, 'GET');
        return data?.pending_count ?? [];
        // updatePendingRequestCount(data.pending_count);
    } catch (error) {
        console.error('Erreur :', error);
    }
}

export async function modifyRelationship(userId, action, method) {
    try {
        await apiRequest(`${apiBase}/relationships/${userId}/${action}/`, method);
    } catch (error) {
        console.error(`Erreur lors de la modification de la relation (${action}):`, error);
    }
}

export async function performUserAction(userId, action) {
    if (!action) {
        console.warn("Action non définie.");
        return;
    }

    const userUrl = `/api/v1/users/${userId}/${action}/`;
    const relationUrl = `/api/v1/users/relationships/${userId}/${action}/`;

    const actions = {
        "add-friend": { url: relationUrl, method: "POST" },
        "remove-friend": { url: relationUrl, method: "DELETE" },
        "block": { url: userUrl, method: "POST" },
        "unblock": { url: userUrl, method: "DELETE" }
    };

    if (!(action in actions)) {
        console.warn(`Action inconnue : ${action}`);
        return;
    }

    try {
        const { url, method } = actions[action];
        await apiRequest(url, method);
        // await state.socialApp.render();

        if (action === "add-friend")
            await state.socialApp.notifyUser(userId);
            await state.socialApp.notifyUser(state.client.userId);
        if (action === 'remove-friend') {
            await state.socialApp.notifyUser(userId);
            await state.socialApp.notifyUser(state.client.userId);
            state.mmakingApp.remove_friend(userId)
        }
        state.socialApp.getPendingCount();
    } catch (error) {
        console.error(`Erreur lors de l'action ${action}:`, error);
    }
}