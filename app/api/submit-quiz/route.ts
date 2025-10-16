// app/api/submit-quiz/route.ts
import { NextResponse } from 'next/server';
import { quizFileProcessor, isGoogleSheetsConfigured, getCurrentQuizNumber } from '@/lib/quiz-file-processor';
import authorizedStudents from '@/data/authorized_students.json';

// --- CONSTANT FOR ERROR CHECKING ---
const DUPLICATE_ERROR_MESSAGE = 'Results already exist for registration code';

// Utility function remains the same
async function sendGroupNotification(studentName: string, quizName: string) {
    const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL;
    const groupJid = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_JID;

    if (!whatsappUrl || !groupJid) {
        console.error('⚠️ [WhatsApp] WHATSAPP_SERVICE_URL or WHATSAPP_GROUP_JID is not configured. Skipping notification.');
        return;
    }

    const messageText =
        `Hi everyone. ${studentName} has just completed ${quizName}. If you haven't started yours already, be encouraged!`;
    
    try {
        const response = await fetch(`${whatsappUrl}/send-message-to-group`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                group_id: groupJid,
                message: messageText,
            }),
            // Set a timeout to prevent the Next.js API route from hanging too long
            signal: AbortSignal.timeout(5000), // 5-second timeout
        });

        if (response.ok) {
            console.log(`✅ [WhatsApp] Notification successfully sent to group: ${groupJid}`);
        } else {
            const errorBody = await response.json();
            console.error(`❌ [WhatsApp] Failed to send notification (Status: ${response.status}):`, errorBody);
        }
    } catch (error) {
        console.error('❌ [WhatsApp] Network error while sending notification:', error);
    }
}

// ----------------------------------------------------------------------
// MAIN POST HANDLER (FIXED)
// ----------------------------------------------------------------------
export async function POST(request: Request) {
    let submissionData: any;

    // 1. DEDICATED BLOCK FOR JSON BODY PARSING
    try {
        submissionData = await request.json();
    } catch (parseError) {
        // This catches errors like malformed JSON or empty body.
        console.error('🛑 [SubmitQuiz API] JSON Body Parsing Failed:', parseError);
        
        return NextResponse.json(
            {
                success: false,
                error: 'Invalid request format. Please ensure data is correctly formatted JSON.',
                details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
                googleSheetsSubmitted: false,
            },
            { status: 400 } // Bad Request: Client sent invalid data
        );
    }
    
    // 2. MAIN LOGIC BLOCK (Now safely using the parsed submissionData)
    try {
        const registrationCode = submissionData.registrationCode as string;
        
        if (!registrationCode) {
            console.error('🛑 [SubmitQuiz API] Missing registrationCode in submission.');
            return NextResponse.json(
                { success: false, error: 'Registration code is missing from submission data.' },
                { status: 400 } // Bad Request: Missing required field
            );
        }

        const quizNumber = getCurrentQuizNumber();
        const quizName = "Quiz " + quizNumber;
        
        const studentName = authorizedStudents[registrationCode as keyof typeof authorizedStudents];
        const isAuthorized = !!studentName;
        
        if (!isAuthorized) {
            const customErrorMessage = "You are trying to make a submission with a registration code not recognised by any of our partner institutions.";
            
            console.error(`🛑 [SubmitQuiz API] Unauthorized submission attempt: Code ${registrationCode} not found.`);
            return NextResponse.json(
                {
                    success: false,
                    error: customErrorMessage,
                    googleSheetsSubmitted: false,
                },
                { status: 403 } // Forbidden: Unauthorized access
            );
        }
        
        if (isGoogleSheetsConfigured()) {
            const submissionResult = await quizFileProcessor.submitQuizResults(
                submissionData, 
                process.env.NEXT_PUBLIC_GOOGLE_TEST_SHEET_ID!
            );
            
            if (submissionResult.success) {
                
                sendGroupNotification(studentName, quizName); // Re-enable when ready
                
                return NextResponse.json({
                    success: true,
                    message: 'Quiz submitted successfully',
                    googleSheetsSubmitted: true,
                    submissionId: `quiz-sub-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                });
            } else {
                // 🚩 FIX: Check for the duplicate entry error message
                const isDuplicate = submissionResult.error?.includes(DUPLICATE_ERROR_MESSAGE);

                if (isDuplicate) {
                    console.warn(`⚠️ [SubmitQuiz API] Duplicate entry detected for ${registrationCode}. Returning 409 Conflict.`);
                    
                    return NextResponse.json(
                        {
                            success: false, // Keep false to signify the action failed due to conflict
                            error: submissionResult.error,
                            message: 'Duplicate submission rejected.',
                            googleSheetsSubmitted: true, // It's technically submitted, just already existed
                        },
                        { status: 409 } // Conflict: Resource already exists
                    );
                }

                // Default error for other submission failures
                console.error('❌ [SubmitQuiz API] Google Sheets submission failed:', submissionResult.error);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to submit quiz results to storage',
                        details: submissionResult.error,
                        googleSheetsSubmitted: false,
                    },
                    { status: 500 } // Internal Server Error: Storage failure
                );
            }
        } else {
            console.error('❌ [SubmitQuiz API] Google Sheets not configured');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Storage system not configured',
                    googleSheetsSubmitted: false,
                },
                { status: 500 } // Internal Server Error: Configuration failure
            );
        }
        
    } catch (appError) {
        // 3. CATCH BLOCK FOR ALL OTHER UNEXPECTED APPLICATION ERRORS
        console.error('❌ [SubmitQuiz API] Application Error during processing:', appError);
        return NextResponse.json(
            {
                success: false,
                error: 'An unexpected internal server error occurred during quiz processing.',
                details: appError instanceof Error ? appError.message : 'Unknown application error',
                googleSheetsSubmitted: false,
            },
            { status: 500 } // Internal Server Error: General crash
        );
    }
}
