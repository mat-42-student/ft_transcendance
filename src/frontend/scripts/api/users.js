import { state } from '../main.js';

export async function apiRequest(endpoint, method = 'GET', body = null) {
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