// app/api/submit-practice-data/route.ts
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library'; 
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); 

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
];

const auth = (SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY) ? new JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: SCOPES,
}) : null;

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
            // Try to parse the string as a date
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            } else {
                console.warn('Invalid date string, using current time:', dateValue);
                return new Date().toISOString();
            }
        } else {
            console.warn('Unexpected date type, using current time:', typeof dateValue, dateValue);
            return new Date().toISOString();
        }
    } catch (error) {
        console.error('Error converting date to ISO string:', error);
        return new Date().toISOString();
    }
};

// Sanitize the payload to ensure all dates are properly handled
const sanitizePayload = (payload: any): PracticeDataPayload => {
    return {
        ...payload,
        startTime: safeToISOString(payload.startTime),
        endTime: safeToISOString(payload.endTime),
        // Ensure other fields have fallbacks
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

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const useSheet = searchParams.get('useSheet') === 'true';

    console.log('🔧 Sheets Configuration Check:', {
        SPREADSHEET_ID: SPREADSHEET_ID ? '✅ Set' : '❌ Missing',
        SERVICE_ACCOUNT_EMAIL: SERVICE_ACCOUNT_EMAIL ? '✅ Set' : '❌ Missing',
        PRIVATE_KEY: PRIVATE_KEY ? '✅ Set' : '❌ Missing',
        auth: auth ? '✅ Created' : '❌ Failed',
        useSheet
    });

    try {
        const rawPayload = await request.json();
        console.log('📦 Received raw payload:', rawPayload);

        // Sanitize the payload to handle date conversion safely
        const sanitizedPayload = sanitizePayload(rawPayload);
        console.log('🧹 Sanitized payload:', sanitizedPayload);

        // Transform data to match sheet headers
        const rowData: SheetRowData = {
            sessionId: sanitizedPayload.sessionId,
            registrationCode: sanitizedPayload.registrationCode || 'N/A',
            category: sanitizedPayload.category,
            startTime: sanitizedPayload.startTime as string, // Already converted to ISO string
            endTime: sanitizedPayload.endTime as string, // Already converted to ISO string
            totalChallenges: sanitizedPayload.totalChallenges,
            totalTimeSeconds: sanitizedPayload.totalTimeSeconds,
            totalQuestionsCompleted: sanitizedPayload.totalQuestionsCompleted,
            totalDontKnows: sanitizedPayload.totalDontKnows,
            totalFirstTrialSuccess: sanitizedPayload.totalFirstTrialSuccess,
            attempts: JSON.stringify(sanitizedPayload.attempts), // Store as JSON string
        };

        console.log('📝 Transformed row data:', rowData);

        if (!useSheet) {
            console.log('📝 Practice data processed (Sheets disabled):', rowData);
            return NextResponse.json({ 
                success: true, 
                message: 'Data processed (Sheets disabled)',
                data: rowData 
            });
        }

        // --- Validate Sheets Configuration ---
        if (!SPREADSHEET_ID || !auth) {
            console.error('❌ Missing Google Sheets configuration');
            return NextResponse.json(
                { 
                    error: 'Server not configured for Sheets logging',
                    fallbackData: rowData 
                },
                { status: 500 }
            );
        }

        console.log('🔌 Connecting to Google Sheets...');
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        
        await doc.loadInfo();
        console.log('📊 Loaded document:', doc.title);
        
        // List all available sheets
        console.log('📑 Available sheets:');
        Object.keys(doc.sheetsByTitle).forEach(title => {
            console.log(`   - "${title}"`);
        });

        const category = sanitizedPayload.category.trim();
        console.log(`🔍 Looking for sheet: "${category}"`);
        
        const sheet = doc.sheetsByTitle[category];
        
        if (!sheet) {
            console.error(`❌ Sheet "${category}" not found. Available sheets:`, Object.keys(doc.sheetsByTitle));
            return NextResponse.json(
                { 
                    error: `Sheet "${category}" not found`,
                    fallbackData: rowData 
                },
                { status: 400 }
            );
        }

        console.log(`✅ Found sheet: "${sheet.title}"`);
        
        // Check sheet headers for debugging
        await sheet.loadHeaderRow();
        console.log('📋 Sheet headers:', sheet.headerValues);
        
        console.log('📝 Adding row with data matching sheet headers...');

        try {
            // Add the row - this will match your sheet headers exactly
            const addedRow = await sheet.addRow(rowData);
            
            console.log(`✅ Successfully logged to "${category}":`, {
                rowNumber: addedRow._rowNumber,
                data: rowData
            });
            
            return NextResponse.json({
                success: true,
                message: `Data logged to "${category}" sheet`,
                data: rowData,
                rowNumber: addedRow._rowNumber
            });
        } catch (sheetError) {
            console.error('❌ Error adding row to sheet:', sheetError);
            
            // Try to get more details about the sheet error
            try {
                const rows = await sheet.getRows();
                console.log(`📊 Current row count in "${category}": ${rows.length}`);
            } catch (countError) {
                console.error('❌ Could not get row count:', countError);
            }
            
            throw sheetError;
        }

    } catch (error) {
        console.error('❌ Detailed error in POST handler:', error);
        
        // More specific error handling
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
            { 
                error: errorMessage,
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: statusCode }
        );
    }
}

// Debug endpoint to check sheet structure
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
