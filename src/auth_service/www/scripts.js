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
            toggleForm();
        } else {
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
            loginSuccessful();
        } else if (data.error == '2fa_required!') {
            alert('Please enter your 2FA code.');
            document.getElementById('totp-group').style.display = 'block';
        } else {
            alert('Login failed: ' + data.error);
        }
    })
    .catch(error => console.error('Error:', error));
}

async function handleOAuth() {
    try {
      const response = await fetch('https://localhost:3000/api/v1/auth/oauth/redirect');
      const data = await response.json();
  
      window.location.href = data.url;
  
    } catch (error) {
      console.error(error);
    }
}
 
function loginSuccessful() {
    const registerContainer = window.document.querySelector('.register-container');
    const loginContainer = window.document.querySelector('.login-container');
    const loginPage = window.document.querySelector('.login-success-page');

    registerContainer.style.display = 'none';
    loginContainer.style.display = 'none';
    loginPage.style.display = 'block';
}

function enroll2fa() {
    token = sessionStorage.getItem('access_token')

    fetch('https://localhost:3000/api/v1/auth/2fa/enroll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const qrCodeImage = `data:image/png;base64,${data.qr_code}`;
            document.getElementById('qr-image').src = qrCodeImage;
        } else {
            console.log("ERROR", data);
            alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

function verify2fa() {
    const token = sessionStorage.getItem('access_token')
    const totp = document.getElementById('totp').value; 

    fetch('https://localhost:3000/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ totp }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("2fa has been enabled!")
        } else {
            console.log("ERROR", data);
            alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}
