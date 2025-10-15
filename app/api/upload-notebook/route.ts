// app/api/upload-notebook/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { notebookProcessor, isNotebookProcessorConfigured } from '@/lib/notebookprocessor';
import authorizedStudents from '@/data/authorized_students.json';

// Define the Mentor Registration Codes
const MENTOR_REG_CODES = [
    '8272025-101001', 
    '8282025-111002'
];

async function sendNotebookGroupNotification(messageText: string) {
    const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL;
    const groupJid = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_JID;

    if (!whatsappUrl || !groupJid) {
        console.error('⚠️ [WhatsApp] WHATSAPP_SERVICE_URL or WHATSAPP_GROUP_JID is not configured. Skipping notification.');
        return;
    }
    
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
            signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
            console.log(`✅ [WhatsApp] Notebook submission notification successfully sent to group: ${groupJid}`);
        } else {
            const errorBody = await response.json();
            console.error(`❌ [WhatsApp] Failed to send notebook notification (Status: ${response.status}):`, errorBody);
        }
    } catch (error) {
        console.error('❌ [WhatsApp] Network error while sending notebook notification:', error);
    }
}


export async function POST(req: NextRequest) {
    if (!isNotebookProcessorConfigured()) {
        return NextResponse.json(
            { success: false, message: 'Server configuration error: Google Drive credentials missing.' },
            { status: 500 }
        );
    }

    try {
        // 1. Get data from the client request
        const data = await req.json();
        const { registrationCode, firstName, lastName, notebookUrl, className } = data; 

        const trimmedCode = registrationCode?.trim();
        
        if (!trimmedCode) {
            return NextResponse.json(
                { success: false, message: 'Submission failed: Registration code is required.' },
                { status: 400 }
            );
        }

        const authorizedStudentName = authorizedStudents[trimmedCode as keyof typeof authorizedStudents];
        const isAuthorized = !!authorizedStudentName;
        
        if (!isAuthorized) {
            console.error(`🛑 [Upload API] Unauthorized submission attempt: Code ${trimmedCode} not found.`);
            return NextResponse.json(
                { success: false, message: 'Submission failed: Invalid registration code. Please check your credentials.' },
                { status: 403 } 
            );
        }

        // --- NEW LOGIC: Determine if the user is a Mentor ---
        const isMentor = MENTOR_REG_CODES.includes(trimmedCode);
        
        // 3. Prepare data for the processor (including the role for folder determination)
        const uploadData = {
            ...data, // Contains firstName, lastName, className, notebookUrl
            registrationCode: trimmedCode, // Ensure trimmed code is used
            isMentor: isMentor
        };
        
        // 4. Perform the server-side upload operation
        const result = await notebookProcessor.processAndUploadNotebook(uploadData);

        if (result.success) {
            // 5. Send Group Notification on Success
            try {
                const notificationName = authorizedStudentName || `${firstName} ${lastName}`; 
                const role = isMentor ? 'Mentor' : 'Student';
                let notificationMessage;
                const trimmedNotificationName = notificationName.trim();
                const trimmedClassName = className.trim();


                // New Line with Zero-Width Space before the URL
                const zwsp = '\u200b';

                if (isMentor) {
                  // Note the structure: Newline, then the ZWSP, then the URL
                  notificationMessage = `Mentor *${trimmedNotificationName}* has uploaded colab notebook for *${trimmedClassName}*, check it out using the below link!\n\n${zwsp}${notebookUrl}`;
                } else {
                  // Student message (no URL, should work fine)
                  notificationMessage = `New Colab notebook Submission by *${trimmedNotificationName}* for *${trimmedClassName}*. Others who havent submitted theirs should follow suit!`;
                }
                
                await sendNotebookGroupNotification(notificationMessage);
                
            } catch (notificationError) {
                console.error('Failed to send group notification (Non-critical error):', notificationError);
            }

            return NextResponse.json(result, { status: 200 });
        } else {
            return NextResponse.json(result, { status: 400 });
        }

    } catch (error) {
        console.error('API Error during notebook upload:', error);
        return NextResponse.json(
            { success: false, message: `Internal server error: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}
