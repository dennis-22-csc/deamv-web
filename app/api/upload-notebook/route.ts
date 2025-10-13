// app/api/upload-notebook/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { notebookProcessor, isNotebookProcessorConfigured } from '@/lib/notebookprocessor';
import authorizedStudents from '@/data/authorized_students.json';


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
        
        // 3. Perform the server-side upload operation
        const result = await notebookProcessor.processAndUploadNotebook(data);

        if (result.success) {
            // 4. Send Group Notification on Success
            try {
                // Use the name provided by the JSON for notification clarity/consistency
                const notificationName = authorizedStudentName || `${firstName} ${lastName}`; 
                const notificationMessage = `New Colab notebook Submission: ${notificationName} (${trimmedCode}) submitted for ${className}. Others should follow suite!`; 
                
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
