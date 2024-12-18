function toggleForm() {
    const loginContainer = document.querySelector('.login-container');
    const signinContainer = document.querySelector('.signin-container');

    if (loginContainer.style.display === 'none') {
        loginContainer.style.display = 'block';
        signinContainer.style.display = 'none';
    } else {
        loginContainer.style.display = 'none';
        signinContainer.style.display = 'block';
    }
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
            alert('Login successful!');
            // Handle successful login (e.g., redirect to another page)
        } else {
            // alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

function handleSignin() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm_password = document.getElementById('confirm-password').value;

    if (!username || !email || !password || !confirm_password) {
        alert('Please fill in all fields.');
        return;
    }

    fetch('https://localhost:3000/api/v1/users/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, confirm_password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Sign-in successful!');
            // Handle successful sign-in (e.g., redirect to another page)
        } else {
            console.log("ERROR");
            alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}
