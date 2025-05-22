import { state } from '../main.js';
import { ft_fetch } from '../main.js';
import { mainErrorMessage } from '../utils.js';

const apiBase = '/api/v1/users';

export async function apiRequest(endpoint, method = 'GET', body = null) {
    if (!state.client.accessToken) return;

    const headers = {};
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await ft_fetch(endpoint, {
        method: method,
        headers: headers,
        body: body instanceof FormData
            ? body
            : (body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null),
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const responseData = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        let errorMessages = [];

        if (response.status === 413) {
            // Erreur spécifique : fichier trop lourd (Nginx)
            errorMessages.push("Le fichier est trop volumineux.");
        } else if (isJson && typeof responseData === 'object') {
            for (const field in responseData) {
                const messages = responseData[field];
                if (Array.isArray(messages)) {
                    errorMessages.push(...messages);
                } else if (typeof messages === 'string') {
                    errorMessages.push(messages);
                }
            }
        } else {
            errorMessages.push(responseData); // HTML ou texte brut
        }

        throw new Error(errorMessages.join('\n'));
    }

    return responseData;
}

export async function updateProfile(formData, userId) {
    const response = await apiRequest(`${apiBase}/${userId}/`, 'PATCH', formData);
    return response;
}

export async function fetchUserProfile(userId) {
    try {
        return await apiRequest(`${apiBase}/${userId}/profile/`);
    } catch (error) {
        return mainErrorMessage(error);
    }
}

export async function fetchFriends(userId) {
    try {
        const data = await apiRequest(`${apiBase}/${userId}/friends/`, 'GET');
        return data?.friends ?? [];
    } catch (error) {
        return mainErrorMessage(error);
    }
}

export async function fetchReceivedRequests() {
    try {
        const data = await apiRequest(`${apiBase}/relationships/received-requests/`, 'GET');
        return data?.received_requests ?? [];
    } catch (error) {
        return mainErrorMessage(error);
    }
}

export async function fetchSentRequests() {
    try {
        const data = await apiRequest(`${apiBase}/relationships/sent-requests/`, 'GET');
        return data?.sent_requests ?? [];
    } catch (error) {
        return mainErrorMessage(error);
    }
}

export async function fetchPendingCount() {
    try {
        const data = await apiRequest(`${apiBase}/relationships/pending-count/`, 'GET');
        return data?.pending_count ?? [];
    } catch (error) {
        return mainErrorMessage(error);
    }
}

export async function modifyRelationship(userId, action, method) {
    try {
        await apiRequest(`${apiBase}/relationships/${userId}/${action}/`, method);
    } catch (error) {
        return mainErrorMessage(error);
    }
}

export async function performUserAction(userId, action) {
    if (!action) {
        return;
    }

    const userUrl = `${apiBase}/${userId}/${action}/`;
    const relationUrl = `${apiBase}/relationships/${userId}/${action}/`;

    const actions = {
        "add-friend": { url: relationUrl, method: "POST" },
        "remove-friend": { url: relationUrl, method: "DELETE" },
        "block": { url: userUrl, method: "POST" },
        "unblock": { url: userUrl, method: "DELETE" }
    };

    if (!(action in actions)) {
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
        return mainErrorMessage(error);
    }
}