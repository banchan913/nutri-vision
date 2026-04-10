// Google Auth Logic (GSI)
let tokenClient;
let accessToken = null;

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // User needs to replace this
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

function initGSI() {
    window.gapi.load('client', async () => {
        await gapi.client.init({
            // We don't use API key here for security, just OAuth
        });
    });

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse.error !== undefined) {
                throw (tokenResponse);
            }
            accessToken = tokenResponse.access_token;
            state.isLoggedIn = true;
            console.log('Login success');
            
            // Fetch User Info
            fetchUserInfo();
            
            // Initialize Sheets
            if (window.initSheets) initSheets();
        },
    });
}

async function fetchUserInfo() {
    // Note: GSI doesn't give profile by default in token flow easily without 'profile' scope
    // But we can use the access token to get it
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userInfo = await resp.json();
    
    state.user = {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
    };
    
    updateUserUI();
    document.getElementById('login-btn').textContent = '接続済み';
    document.getElementById('login-btn').classList.replace('btn-secondary', 'btn-primary');
}

function handleLogin() {
    if (!accessToken) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}

document.getElementById('login-btn').addEventListener('click', handleLogin);

// Load the library and init
window.onload = () => {
    // Scripts are loaded via index.html (async/defer)
    // We wait a bit or use script onload events
    setTimeout(initGSI, 1000); 
};
