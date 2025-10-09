const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

// Authenticate using env variables
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Sets up the Google Sheet with tabs for Quiz 1 through Quiz 4 
 * and writes the submission headers to the first row of each tab.
 */
async function setupQuizSheets() {
  const spreadsheetId = process.env.GOOGLE_TEST_SHEET_ID;
  
  // Headers for quiz data submission, tailored for metrics and identifiers
  const headers = [
    'registrationCode',
    'sessionId',
    'startTime',
    'endTime',
    'totalTimeSeconds',
    'totalQuestions',
    'answeredCount',
    'completionRate', 
    'submissionTime', 
    'answersJson', 
  ];
  
  // The column range will be dynamic based on the number of headers
  const endColumn = String.fromCharCode('A'.charCodeAt(0) + headers.length - 1);
  const range = `A1:${endColumn}1`; // e.g., A1:J1 for 10 headers
  const NUM_QUIZZES = 4;

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

    // 2️⃣ Prepare requests for new tabs (Quiz 1–Quiz 4)
    const requests = [];
    for (let i = 1; i <= NUM_QUIZZES; i++) {
      const tabName = `Quiz ${i}`;
      if (!existingSheets.includes(tabName)) {
        requests.push({
          addSheet: {
            properties: { title: tabName },
          },
        });
      }
    }

    if (requests.length > 0) {
      console.log(`🆕 Creating ${requests.length} missing quiz tabs...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    } else {
      console.log(`✅ All Quiz 1–Quiz ${NUM_QUIZZES} tabs already exist.`);
    }

    // 3️⃣ Write headers to each Quiz tab
    for (let i = 1; i <= NUM_QUIZZES; i++) {
      const tabName = `Quiz ${i}`;
      console.log(`✏️ Writing headers to ${tabName} in range ${range}...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!${range}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });
    }

    console.log(`✅ Headers written to all Quiz 1–Quiz ${NUM_QUIZZES} tabs successfully!`);

  } catch (error) {
    console.error('❌ Error setting up quiz sheets:', error.message);
  }
}

setupQuizSheets();
