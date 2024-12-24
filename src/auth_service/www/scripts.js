function toggleForm() {
    const loginContainer = document.querySelector('.login-container');
    const registerContainer = document.querySelector('.register-container');

    if (loginContainer.style.display === 'none') {
        loginContainer.style.display = 'block';
        registerContainer.style.display = 'none';
    } else {
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
    }
}

function handleregister() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm_password = document.getElementById('confirm-password').value;

    if (!username || !email || !password || !confirm_password) {
        alert('Please fill in all fields.');
        return;
    }

    console.log(username, email, password, confirm_password);

    fetch('https://localhost:3000/api/v1/users/register/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, confirm_password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Successfully registered!');
        } else {
            console.log("ERROR", data);
            alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('Please fill in both fields.');
        return;
    }

    fetch('https://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            sessionStorage.setItem('access_token', data.accessToken);
            alert('Login successful!');
        } else {
            // alert(data.message);
            console.log('FAILED');
            // alert("FAILED");
        }
    })
    .catch(error => console.error('Error:', error));
}

function handleOAuth42() {
    const oauthUrl = 'https://api.intra.42.fr/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code';
    window.location.href = oauthUrl;
}
