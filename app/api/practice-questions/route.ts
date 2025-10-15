// app/api/practice-questions/route.ts
import { NextResponse } from 'next/server';
import { practiceFileProcessor, isGoogleDriveConfigured } from '@/lib/practice-file-processor';

export async function GET() {
  try {
    console.log('🔍 [PracticeQuestions API] Starting practice questions download');
    
    // Check if Google Drive is configured
    if (!isGoogleDriveConfigured()) {
      console.error('❌ [PracticeQuestions API] Google Drive not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Google Drive not configured. Please check server configuration.',
        },
        { status: 500 }
      );
    }

    console.log('🔍 [PracticeQuestions API] Google Drive configured, attempting CSV downloads');
    const result = await practiceFileProcessor.downloadAllPracticeQuestions();
    
    if (result.success && result.questions && result.questions.length > 0) {
      console.log(`✅ [PracticeQuestions API] Successfully parsed ${result.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        message: result.message,
        questions: result.questions, // Send parsed questions to client
        totalProcessed: result.questions.length, // Client will handle actual saving
        totalFailed: result.totalFailed,
        categoriesFound: result.categoriesFound,
        processingTime: result.processingTime,
        source: 'google_drive_csv'
      });
    } else {
      console.error(`❌ [PracticeQuestions API] Practice questions download failed:`, result.errors);
      
      return NextResponse.json(
        {
          success: false,
          error: `Failed to load practice questions`,
          details: result.errors.join(', '),
          questions: [], // Empty array on failure
          totalProcessed: 0,
          totalFailed: result.totalFailed,
          categoriesFound: [],
          source: 'google_drive_csv_failed'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ [PracticeQuestions API] Error loading practice questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load practice questions',
        details: error instanceof Error ? error.message : 'Unknown error',
        questions: [], // Empty array on error
        totalProcessed: 0,
        totalFailed: 0,
        categoriesFound: [],
        source: 'error'
      },
      { status: 500 }
    );
  }
}
