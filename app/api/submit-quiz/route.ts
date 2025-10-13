// app/api/submit-quiz/route.ts
import { NextResponse } from 'next/server';
import { quizFileProcessor, isGoogleSheetsConfigured, getCurrentQuizNumber } from '@/lib/quiz-file-processor';
import authorizedStudents from '@/data/authorized_students.json';

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


export async function POST(request: Request) {
    try {
        const submissionData = await request.json();
        const registrationCode = submissionData.registrationCode as string;
        
        const quizNumber = getCurrentQuizNumber();
        const quizName = "Quiz " + quizNumber; 
        
        
        console.log('📝 [SubmitQuiz API] Quiz submission received:', {
            registrationCode: registrationCode,
            answeredCount: submissionData.answeredCount,
            totalQuestions: submissionData.totalQuestions,
            timeSpent: submissionData.totalTime,
            quizName: quizName,
        });
        
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
                { status: 403 }
            );
        }
        console.log(`✅ [SubmitQuiz API] Authorized submission for: ${registrationCode} (${studentName})`);
        
        if (isGoogleSheetsConfigured()) {
            console.log('🔍 [SubmitQuiz API] Google Sheets configured, attempting submission');
            const submissionResult = await quizFileProcessor.submitQuizResults(
                submissionData, 
                process.env.NEXT_PUBLIC_GOOGLE_TEST_SHEET_ID!
            );
            
            if (submissionResult.success) {
                console.log('✅ [SubmitQuiz API] Successfully submitted to Google Sheets');
                
                sendGroupNotification(studentName, quizName);
                
                return NextResponse.json({
                    success: true,
                    message: 'Quiz submitted successfully',
                    googleSheetsSubmitted: true,
                    submissionId: `quiz-sub-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                });
            } else {
                console.error('❌ [SubmitQuiz API] Google Sheets submission failed:', submissionResult.error);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to submit quiz results to storage',
                        details: submissionResult.error,
                        googleSheetsSubmitted: false,
                    },
                    { status: 500 }
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
                { status: 500 }
            );
        }
        
    } catch (error) {
        console.error('❌ [SubmitQuiz API] Error processing quiz submission:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process quiz submission',
                googleSheetsSubmitted: false,
            },
            { status: 500 }
        );
    }
}
