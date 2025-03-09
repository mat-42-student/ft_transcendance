import { state } from '../main.js';

const apiBase = '/api/v1/users';

async function apiRequest(endpoint, method = 'GET', body = null) {
    if (!state.client.accessToken) {
        console.error("User is not connected");
        return;
    }
    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Authorization': `Bearer ${state.client.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : null,
        });
        
        if (!response.ok) {
            throw new Error(`API Error (${response.status}): ${await response.text()}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
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
        return await apiRequest(url, method);
    } catch (error) {
        console.error(`Erreur lors de l'action ${action}:`, error);
    }
}