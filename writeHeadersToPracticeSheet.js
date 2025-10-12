const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

// Authenticate using env variables
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL,
    private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });

async function setupClassSheets() {
  const spreadsheetId = process.env.NEXT_PUBLIC_GOOGLE_PRACTICE_SHEET_ID;
  const headers = [
    'sessionId',
    'registrationCode',
    'category',
    'startTime',
    'endTime',
    'totalChallenges',
    'totalTimeSeconds',
    'totalQuestionsCompleted',
    'totalDontKnows',
    'totalFirstTrialSuccess',
    'attempts',
  ];

  console.log(`📄 Target Sheet ID: ${spreadsheetId}`);

  try {
    // 1️⃣ Get existing sheets
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });
    const existingSheets = sheetInfo.data.sheets.map(
      (s) => s.properties.title
    );

    // 2️⃣ Prepare requests for new tabs (Class1–Class10)
    const requests = [];
    for (let i = 1; i <= 10; i++) {
      const tabName = `Class ${i}`;
      if (!existingSheets.includes(tabName)) {
        requests.push({
          addSheet: {
            properties: { title: tabName },
          },
        });
      }
    }

    if (requests.length > 0) {
      console.log(`🆕 Creating ${requests.length} missing class tabs...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    } else {
      console.log('✅ All Class1–Class10 tabs already exist.');
    }

    // 3️⃣ Write headers to each Class tab
    for (let i = 1; i <= 10; i++) {
      const tabName = `Class ${i}`;
      console.log(`✏️ Writing headers to ${tabName}...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1:K1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });
    }

    console.log('✅ Headers written to all Class1–Class10 tabs successfully!');

  } catch (error) {
    console.error('❌ Error setting up class sheets:', error.message);
  }
}

setupClassSheets();

