import { state } from '../main.js'

export async function fetchFriends() {
    if (!state.client.accessToken) {
        console.error("User is not connected");
        return;
    }
    try {
        const response = await fetch('api/v1/users/' + state.client.userId + '/friends/', {
            headers: {
                'Authorization': `Bearer ${state.client.accessToken}`,
            },
        });
        if (response.ok) {
            const data = await response.json();
            if (!data.friends) {
                console.error("Error fetching friends: ", data.friends);
                return;
            }
            state.socialApp.friendList = new Map(data.friends.map(friend => [friend.id, friend]));
        } else {
            console.error("Error while loading friendList :", response.status);
        }
    } catch (error) {
        console.error("Fetch error: ", error);
    }
}

export async function fetchReceivedRequests() {
    if (!state.client.accessToken) {
        console.error("User is not connected");
        return;
    }
    try {
        const response = await fetch('api/v1/users/relationships/received-requests/', {
            headers: {
                'Authorization': `Bearer ${state.client.accessToken}`,
            },
        });
        if (response.ok) {
            const data = await response.json();
            if (!data.received_requests) {
                console.error("Error fetching received friend requests: ", data.received_requests);
                return;
            }
            state.socialApp.friendReceivedRequests = new Map(data.received_requests.map(friend => [friend.id, friend]));
        } else {
            console.error("Error while loading received friend requests:", response.status);
        }
    } catch (error) {
        console.error("Fetch error: ", error);
    }
}

export async function fetchSentRequests() {
    if (!state.client.accessToken) {
        console.error("User is not connected");
        return;
    }
    try {
        const response = await fetch('api/v1/users/relationships/sent-requests/', {
            headers: {
                'Authorization': `Bearer ${state.client.accessToken}`,
            },
        });
        if (response.ok) {
            const data = await response.json();
            if (!data.sent_requests) {
                console.error("Error fetching sent friend requests: ", data.sent_requests);
                return;
            }
            state.socialApp.friendSentRequests = new Map(data.sent_requests.map(friend => [friend.id, friend]));
        } else {
            console.error("Error while loading sent friend requests:", response.status);
        }
    } catch (error) {
        console.error("Fetch error: ", error);
    }
}