# API `auth`

## Endpoints

1. **Login**
   - **Description** : `Login with email, password and totp if 2fa is enable`
   - **URL** : `/api/v1/auth/login`
   - **Method** : `POST`
   - **Response** :
     ```json
     [
       {
         "accessToken": "<token>"
       },
       ...
     ]
     ```

2. **Logout**
   - **Description** : `Send an empty cookie to logout`
   - **URL** : `/api/v1/auth/logout`
   - **Method** : `POST`
   - **Response** :
     ```json
     [
       {
         "message": "success"
       },
       ...
     ]
     ```
3. **Refresh**
   - **Description** : `Return a new access token`
   - **URL** : `/api/v1/auth/refresh`
   - **Method** : `POST`
   - **Response** :
     ```json
     [
       {
         "message": "success"
       },
       ...
     ]
     ```

4. **Enable-2FA**
   - **Description** : ``
   - **URL** : `/api/v1/auth/2fa/enable-2fa`
   - **Method** : `POST`
   - **Response** :
     ```json
     [
       {
         "message": "success"
       },
       ...
     ]
     ```

5. **Disable-2FA**
   - **Description** : ``
   - **URL** : `/api/v1/auth/2fa/disable-2fa`
   - **Method** : `POST`
   - **Response** :
     ```json
     [
       {
         "message": "success"
       },
       ...
     ]
     ```
6. **OAuth Redirect**
   - **Description** : ``
   - **URL** : `/api/v1/auth/oauth/redirect`
   - **Method** : `POST`
   - **Response** :
     ```json
     [
       {
         "message": "success"
       },
       ...
     ]
     ```

7. **OAuth Callback**
   - **Description** : ``
   - **URL** : `/api/v1/auth/oauth/callback`
   - **Method** : `POST`
   - **Response** :
     ```json
     [
       {
         "message": "success"
       },
       ...
     ]
     ```

---

