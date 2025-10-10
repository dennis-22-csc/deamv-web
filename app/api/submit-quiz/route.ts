// app/api/submit-quiz/route.ts
import { NextResponse } from 'next/server';
import { quizFileProcessor, isGoogleSheetsConfigured } from '@/lib/quiz-file-processor';
import authorizedStudents from '@/data/authorized_students.json';


export async function POST(request: Request) {
  try {
    const submissionData = await request.json();
    const registrationCode = submissionData.registrationCode as string;
    
    console.log('📝 [SubmitQuiz API] Quiz submission received:', {
      registrationCode: registrationCode,
      answeredCount: submissionData.answeredCount,
      totalQuestions: submissionData.totalQuestions,
      timeSpent: submissionData.totalTime,
    });
    
    const isAuthorized = Object.keys(authorizedStudents).includes(registrationCode);
    
    if (!isAuthorized) {
        const customErrorMessage = "You are trying to make a submission with a registration code not recognised by any of our partner institutions.";
        
        console.error(`🛑 [SubmitQuiz API] Unauthorized submission attempt: Code ${registrationCode} not found.`);
        return NextResponse.json(
          {
            success: false,
            error:  customErrorMessage,
            googleSheetsSubmitted: false,
          },
          // Use 401 Unauthorized or 403 Forbidden status for security failure
          { status: 403 } 
        );
    }
    console.log(`✅ [SubmitQuiz API] Authorized submission for: ${registrationCode} (${authorizedStudents[registrationCode as keyof typeof authorizedStudents]})`);
    
    // Submit to Google Sheets
    if (isGoogleSheetsConfigured()) {
      console.log('🔍 [SubmitQuiz API] Google Sheets configured, attempting submission');
      const submissionResult = await quizFileProcessor.submitQuizResults(
        submissionData, 
        process.env.NEXT_PUBLIC_GOOGLE_TEST_SHEET_ID!
      );
      
      if (submissionResult.success) {
        console.log('✅ [SubmitQuiz API] Successfully submitted to Google Sheets');
        
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
