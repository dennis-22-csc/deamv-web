require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');
const open = (...args) => import('open').then(m => m.default(...args));

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file.");
  process.exit(1);
}

async function getRefreshToken() {
  const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('1. Authorize this app by visiting this URL:');
  console.log(authUrl);

  console.log('\n2. Opening browser now...');
  await open(authUrl);

  // Create local server to receive the OAuth callback
  const server = http.createServer(async (req, res) => {
    if (req.url.includes('/?code=')) {
      const qs = new URL(req.url, 'http://localhost:3000').searchParams;
      const code = qs.get('code');

      res.end('✅ Authorization successful! You can close this tab.');

      server.close();

      try {
        const { tokens } = await oAuth2Client.getToken(code);
        console.log('\n======================================================');
        console.log('✅ SUCCESS! Your Refresh Token is below. Save it!');
        console.log('======================================================');
        console.log(`REFRESH_TOKEN: ${tokens.refresh_token}`);
        console.log('\n💡 Add this token to your app as NEXT_PUBLIC_GOOGLE_REFRESH_TOKEN');
        console.log('======================================================');
      } catch (error) {
        console.error('\n❌ Error exchanging code for token:', error.message);
      }
    } else {
      res.end('Waiting for authorization...');
    }
  }).listen(3000, () => {
    console.log('\n3. Waiting for OAuth callback on http://localhost:3000...');
  });
}

getRefreshToken();

