// app/api/upload-notebook/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { notebookProcessor, isNotebookProcessorConfigured } from '@/lib/notebookprocessor'; 

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

        // 2. Perform the server-side operation
        const result = await notebookProcessor.processAndUploadNotebook(data);

        if (result.success) {
            return NextResponse.json(result, { status: 200 });
        } else {
            // Return failure details
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
