require('dotenv').config();

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const readline = require('readline');

// --- Use environment variables ---
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; 
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Basic check to ensure variables are loaded
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not found in environment variables. Did you create an .env file and run 'npm install dotenv'?");
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function getRefreshToken() {
    const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    // 1. Generate the Authorization URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial: ensures we get a Refresh Token
        scope: SCOPES,
        prompt: 'consent', // Ensures the consent screen is shown every time
    });

    console.log('1. Authorize this app by visiting this URL:');
    console.log(authUrl);

    // 2. Get the Authorization Code from the user
    rl.question('\n2. Enter the code from that page here: ', async (code) => {
        rl.close();
        try {
            // 3. Exchange the code for tokens
            const { tokens } = await oAuth2Client.getToken(code.trim());

            console.log('\n======================================================');
            console.log('✅ SUCCESS! Your Refresh Token is below. Save it!');
            console.log('======================================================');
            console.log(`REFRESH_TOKEN: ${tokens.refresh_token}`);
            console.log('\n💡 Add this token to your application configuration as NEXT_PUBLIC_GOOGLE_REFRESH_TOKEN.');
            console.log('======================================================');

        } catch (error) {
            console.error('\n❌ Error retrieving token:', error.message);
        }
    });
}

getRefreshToken();
