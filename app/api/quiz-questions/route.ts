// app/api/quiz-questions/route.ts
import { NextResponse } from 'next/server';
import { quizFileProcessor, isGoogleDriveConfigured, getCurrentQuizNumber } from '@/lib/quiz-file-processor';

export async function GET() {
  try {
    const quizNumber = getCurrentQuizNumber();
    //console.log(`🔍 [QuizQuestions API] Starting quiz questions download for Quiz ${quizNumber}`);
    
    // Check if Google Drive is configured
    if (!isGoogleDriveConfigured()) {
      //console.error('❌ [QuizQuestions API] Google Drive not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Google Drive not configured. Please check server configuration.',
        },
        { status: 500 }
      );
    }

    //console.log(`🔍 [QuizQuestions API] Google Drive configured, attempting CSV download for Quiz ${quizNumber}`);
    const result = await quizFileProcessor.downloadQuizQuestions();
    
    if (result.success && result.questions.length > 0) {
      //console.log(`✅ [QuizQuestions API] Successfully loaded ${result.questions.length} questions for Quiz ${quizNumber}`);
      
      return NextResponse.json({
        success: true,
        questions: result.questions,
        total: result.questions.length,
        quizNumber: quizNumber,
        source: 'google_drive_csv',
        timestamp: new Date().toISOString()
      });
    } else {
      //console.error(`❌ [QuizQuestions API] Quiz ${quizNumber} download failed:`, result.errors);
      
      return NextResponse.json(
        {
          success: false,
          error: `Failed to load quiz questions for Quiz ${quizNumber}`,
          details: result.errors.join(', '),
          questions: [],
          total: 0,
          quizNumber: quizNumber,
          source: 'google_drive_csv_failed'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    //console.error('❌ [QuizQuestions API] Error loading quiz questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load quiz questions',
        details: error instanceof Error ? error.message : 'Unknown error',
        questions: [],
        total: 0,
        source: 'error'
      },
      { status: 500 }
    );
  }
}
