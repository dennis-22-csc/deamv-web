// app/api/submit-practice-data/route.ts
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';
import authorizedStudents from '@/data/authorized_students.json';

const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_PRACTICE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
];

const auth = (SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY) ? new JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: SCOPES,
}) : null;

// --- Interfaces and Utility Functions (Unchanged) ---

interface SheetRowData {
    [key: string]: any;
    sessionId: string;
    registrationCode: string | null;
    category: string;
    startTime: string;
    endTime: string;
    totalChallenges: number;
    totalTimeSeconds: number;
    totalQuestionsCompleted: number;
    totalDontKnows: number;
    totalFirstTrialSuccess: number;
    attempts: string;
}
interface PracticeDataPayload {
    sessionId: string;
    registrationCode: string | null;
    category: string;
    startTime: Date | string;
    endTime: Date | string;
    totalChallenges: number;
    totalTimeSeconds: number;
    totalQuestionsCompleted: number;
    totalDontKnows: number;
    totalFirstTrialSuccess: number;
    attempts: any[];
}

// Utility function to safely convert to Date and then to ISO string
const safeToISOString = (dateValue: Date | string): string => {
    try {
        if (dateValue instanceof Date) {
            return dateValue.toISOString();
        } else if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            } else {
                return new Date().toISOString();
            }
        } else {
            return new Date().toISOString();
        }
    } catch (error) {
        return new Date().toISOString();
    }
};

// Sanitize the payload to ensure all dates are properly handled
const sanitizePayload = (payload: any): PracticeDataPayload => {
    return {
        ...payload,
        startTime: safeToISOString(payload.startTime),
        endTime: safeToISOString(payload.endTime),
        sessionId: payload.sessionId || `session-${Date.now()}`,
        registrationCode: payload.registrationCode || null,
        category: payload.category || 'Unknown',
        totalChallenges: Number(payload.totalChallenges) || 0,
        totalTimeSeconds: Number(payload.totalTimeSeconds) || 0,
        totalQuestionsCompleted: Number(payload.totalQuestionsCompleted) || 0,
        totalDontKnows: Number(payload.totalDontKnows) || 0,
        totalFirstTrialSuccess: Number(payload.totalFirstTrialSuccess) || 0,
        attempts: Array.isArray(payload.attempts) ? payload.attempts : [],
    };
};

async function sendGroupNotification(studentName: string, category: string) {
    const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL; 
    const groupJid = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_JID;

    if (!whatsappUrl || !groupJid) {
        console.error('⚠️ [WhatsApp] WHATSAPP_SERVICE_URL or WHATSAPP_GROUP_JID not configured. Skipping notification.');
        return;
    }
    
    // The message is constructed using student name and practice category
    const messageText = 
        `Hi everyone. ${studentName} has successfully completed a practice session in the *${category}* category. You can do it too! 💪`;
    
    try {
        const response = await fetch(`${whatsappUrl}/send-message-to-group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                group_id: groupJid,
                message: messageText,
            }),
            signal: AbortSignal.timeout(5000), // 5-second timeout
        });

        if (response.ok) {
            console.log(`✅ [WhatsApp] Practice notification sent to group: ${groupJid}`);
        } else {
            const errorBody = await response.json();
            console.error(`❌ [WhatsApp] Failed to send notification (Status: ${response.status}):`, errorBody);
        }
    } catch (error) {
        console.error('❌ [WhatsApp] Network error while sending practice notification:', error);
    }
}


export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const useSheet = searchParams.get('useSheet') === 'true';

    try {
        const rawPayload = await request.json();
        const sanitizedPayload = sanitizePayload(rawPayload);
        const registrationCode = sanitizedPayload.registrationCode;
        
        // --- 1. REGISTRATION CODE VALIDATION ---
        
        // Ensure registrationCode is present and is a string
        if (!registrationCode || typeof registrationCode !== 'string') {
            console.error('🛑 [Practice API] Submission rejected: Missing registration code.');
            return NextResponse.json(
                { success: false, error: 'Registration code is required for practice submission.' },
                { status: 400 }
            );
        }

        const studentName = authorizedStudents[registrationCode as keyof typeof authorizedStudents];
        const isAuthorized = !!studentName;

        if (!isAuthorized) {
            console.error(`🛑 [Practice API] Unauthorized submission attempt: Code ${registrationCode} not found.`);
            return NextResponse.json(
                { success: false, error: "Registration code not recognized by our partner institutions." },
                { status: 403 }
            );
        }
        
        console.log(`✅ [Practice API] Authorized practice submission for: ${registrationCode} (${studentName})`);


        // --- 2. DATA PREPARATION & SHEET LOGGING ---

        const rowData: SheetRowData = {
            sessionId: sanitizedPayload.sessionId,
            registrationCode: registrationCode, // Use the validated code
            category: sanitizedPayload.category,
            startTime: sanitizedPayload.startTime as string,
            endTime: sanitizedPayload.endTime as string,
            totalChallenges: sanitizedPayload.totalChallenges,
            totalTimeSeconds: sanitizedPayload.totalTimeSeconds,
            totalQuestionsCompleted: sanitizedPayload.totalQuestionsCompleted,
            totalDontKnows: sanitizedPayload.totalDontKnows,
            totalFirstTrialSuccess: sanitizedPayload.totalFirstTrialSuccess,
            attempts: JSON.stringify(sanitizedPayload.attempts),
        };
        
        
        // --- Google Sheets Logic (Only if useSheet=true) ---

        if (!SPREADSHEET_ID || !auth) {
            return NextResponse.json({ error: 'Server not configured for Sheets logging', fallbackData: rowData }, { status: 500 });
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        await doc.loadInfo();
        
        const category = sanitizedPayload.category.trim();
        const sheet = doc.sheetsByTitle[category];
        
        if (!sheet) {
            return NextResponse.json({ error: `Sheet "${category}" not found`, fallbackData: rowData }, { status: 400 });
        }

        await sheet.loadHeaderRow();

        try {
            // Add the row to Google Sheets
            const addedRow = await sheet.addRow(rowData);

            // --- 3. WHATSAPP NOTIFICATION ---
            // Send the notification after successful data logging (Fire and forget)
            //sendGroupNotification(studentName, category);

            return NextResponse.json({
                success: true,
                message: `Data logged to "${category}" sheet, notification sent.`,
                data: rowData,
                rowNumber: (addedRow as any).rowNumber || 'Unknown (Check Sheet)'
            });
        } catch (sheetError) {
            // ... (Sheet error handling remains the same)
            try {
                const rows = await sheet.getRows();
                console.log(`📊 Current row count in "${category}": ${rows.length}`);
            } catch (countError) {
                console.error('❌ Could not get row count:', countError);
            }
            
            throw sheetError;
        }

    } catch (error) {
        // ... (General error handling remains the same)
        console.error('❌ Detailed error in POST handler:', error);
        
        let errorMessage = 'Failed to process data';
        let statusCode = 500;
        
        if (error instanceof Error) {
            if (error.message.includes('PERMISSION_DENIED')) {
                errorMessage = 'Permission denied - check service account permissions';
                statusCode = 403;
            } else if (error.message.includes('UNAUTHENTICATED')) {
                errorMessage = 'Authentication failed - check credentials';
                statusCode = 401;
            } else if (error.message.includes('NOT_FOUND')) {
                errorMessage = 'Spreadsheet not found - check SPREADSHEET_ID';
                statusCode = 404;
            } else if (error.message.includes('toISOString')) {
                errorMessage = 'Date conversion failed - invalid date format';
                statusCode = 400;
            }
        }
        
        return NextResponse.json(
            { error: errorMessage, details: error instanceof Error ? error.message : 'Unknown error' },
            { status: statusCode }
        );
    }
}


// --- GET and HEAD endpoints (Unchanged) ---
export async function GET(request: Request) {
    try {
        if (!SPREADSHEET_ID || !auth) {
            return NextResponse.json({
                error: 'Sheets not configured',
                config: {
                    SPREADSHEET_ID: !!SPREADSHEET_ID,
                    SERVICE_ACCOUNT_EMAIL: !!SERVICE_ACCOUNT_EMAIL,
                    PRIVATE_KEY: !!PRIVATE_KEY,
                    auth: !!auth
                }
            }, { status: 500 });
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        await doc.loadInfo();
        
        const sheets = await Promise.all(
            Object.keys(doc.sheetsByTitle).map(async (title) => {
                const sheet = doc.sheetsByTitle[title];
                try {
                    await sheet.loadHeaderRow();
                    const rows = await sheet.getRows();
                    return {
                        title,
                        id: sheet.sheetId,
                        rowCount: sheet.rowCount,
                        actualRows: rows.length,
                        headerValues: sheet.headerValues || [],
                        sampleData: rows.length > 0 ? rows[0].toObject() : 'No data'
                    };
                } catch (sheetError) {
                    return {
                        title,
                        id: sheet.sheetId,
                        rowCount: sheet.rowCount,
                        actualRows: 'Error loading',
                        headerValues: 'Error loading',
                        sampleData: 'Error loading',
                        error: (sheetError as Error).message
                    };
                }
            })
        );
        
        return NextResponse.json({
            spreadsheet: doc.title,
            sheets,
            totalSheets: sheets.length,
            environment: {
                node: process.version,
                hasSheetsConfig: !!(SPREADSHEET_ID && SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY)
            }
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        return NextResponse.json({
            error: 'Debug failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        }, { status: 500 });
    }
}

// Health check endpoint
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}
