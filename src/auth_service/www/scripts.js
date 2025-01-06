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
        credentials: 'include',
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

document.addEventListener('DOMContentLoaded', function() {
    // 1. Check if we have ?code=... in the URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
  
    // 2. If we do, call your Django /callback endpoint
    if (code && state) {
      // Construct the URL to your Django OAuth callback
      const callbackUrl = `https://localhost:3000/api/v1/auth/oauth/callback?code=${code}&state=${state}`;
  
      fetch(callbackUrl)
        .then(response => response.json())
        .then(data => {
          // data should be { success: "true", accessToken: "...." } if all went well
          if (data.accessToken) {
            // 3. Store the access token in localStorage
            sessionStorage.setItem('accessToken', data.accessToken);
  
            // The refresh token is already in the HttpOnly cookie.
  
            // 4. Clear the URL so you don't keep the code in the address bar
            // One approach: set window.location without the params or navigate to another page
            window.history.replaceState({}, document.title, window.location.pathname);
  
            // 5. Optionally redirect to your "dashboard" or show a success message
            // window.location.href = "/dashboard.html"; 
            console.log("OAuth success, token stored in localStorage!");
          } else {
            console.error("No accessToken returned from backend", data);
          }
        })
        .catch(err => console.error("Error exchanging code for token:", err));
    }
  });
  
 
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
            console.log("Error", data);
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
            console.log("Error", data);
            alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

function rereshToken() {
    fetch('https://localhost:3000/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"email": "test@mail.com"}),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(data)
        } else {
            console.log("Error", data);
        }
    })
}
