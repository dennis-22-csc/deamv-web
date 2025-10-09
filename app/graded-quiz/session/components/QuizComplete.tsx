// app/graded-quiz/session/components/QuizComplete.tsx
'use client';

import { useEffect, useState, useRef } from 'react'; 
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, BarChart3, UploadCloud } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface QuizSessionData {
  questions: any[];
  startTime: number;
  endTime: number;
  registrationCode: string;
  userAnswers: { [key: number]: string };
}

interface QuizCompleteProps {
  sessionData: QuizSessionData;
}

export const QuizComplete: React.FC<QuizCompleteProps> = ({ sessionData }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitErrorDetail, setSubmitErrorDetail] = useState<string | null>(null);
  const hasSubmittedAttempt = useRef(false);
  
  // Calculations for summary and submission
  const totalQuestions = sessionData.questions.length;
  const answeredCount = Object.keys(sessionData.userAnswers).length;
  const totalTime = Math.round((sessionData.endTime - sessionData.startTime) / 1000); // in seconds

  useEffect(() => {
    let isMounted = true; 

    const initialSubmit = () => {
        if (!hasSubmittedAttempt.current) {
            hasSubmittedAttempt.current = true;
            handleSubmitResults();
        }
    };

    // Auto-submit results when component mounts
    initialSubmit();

    return () => {
        isMounted = false;
    };
  }, []); // Empty dependency array ensures it runs once on mount

  const handleSubmitResults = async () => {
    setIsSubmitting(true);
    setSubmitErrorDetail(null); // Clear previous errors
    
    try {
      // Prepare submission data
      const submissionData = {
        registrationCode: sessionData.registrationCode,
        sessionId: `quiz-${sessionData.startTime}`,
        startTime: new Date(sessionData.startTime).toISOString(),
        endTime: new Date(sessionData.endTime).toISOString(),
        totalTime,
        totalQuestions,
        answeredCount,
        answers: sessionData.userAnswers,
        questions: sessionData.questions,
      };

      // Submit to your backend API
      const response = await fetch('/api/submit-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        setSubmitStatus('success');
      } else {
        // 🚨 ENHANCED ERROR HANDLING: Get status and text for better debugging
        const status = response.status;
        const errorText = await response.text();
        const fullError = `Submission failed: Status ${status}. Response: ${errorText.substring(0, 100)}`;
        
        console.error('Submission failed details:', fullError);
        setSubmitErrorDetail(fullError);
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      // Fallback for network errors or errors thrown above
      if (!submitErrorDetail) {
          setSubmitErrorDetail(error instanceof Error ? error.message : 'Unknown submission error');
      }
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrySubmit = () => {
    setSubmitStatus('idle');
    handleSubmitResults();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-2xl w-full">
        <div className="text-center space-y-6">
          {/* Header */}
          <div className="space-y-3">
            {submitStatus === 'success' ? (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            ) : submitStatus === 'error' ? (
              <UploadCloud className="h-16 w-16 text-red-500 mx-auto" />
            ) : (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto" />
            )}
            
            <h1 className="text-3xl font-bold text-gray-900">
              {submitStatus === 'success' ? 'Quiz Submitted!' : 
               submitStatus === 'error' ? 'Submission Failed' : 
               'Submitting Quiz...'}
            </h1>
            
            <p className="text-gray-600">
              {submitStatus === 'success' ? 'Your answers have been successfully submitted.' :
               submitStatus === 'error' ? 'There was an error submitting your quiz.' :
               'Please wait while we submit your answers...'}
            </p>
          </div>

          {/* Quiz Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 border">
              <BarChart3 className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="font-semibold text-gray-700">Questions Answered</div>
              <div className="text-2xl font-bold text-blue-600">{answeredCount}/{totalQuestions}</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border">
              <Clock className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <div className="font-semibold text-gray-700">Time Taken</div>
              <div className="text-xl font-bold text-green-600">{formatTime(totalTime)}</div>
            </div>
          </div>

          {/* Submission Status */}
          {submitStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 justify-center text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Successfully submitted to server</span>
              </div>
              <p className="text-green-600 text-sm mt-1">
                Your registration code: <strong>{sessionData.registrationCode}</strong>
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 justify-center text-red-700">
                <UploadCloud className="h-5 w-5" />
                <span className="font-medium">Submission failed</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                Your answers are saved locally and will be retried.
              </p>
              {/* Display detailed error message for debugging */}
              {submitErrorDetail && (
                  <p className="text-red-600 text-xs mt-2 overflow-auto max-h-20 break-words">
                      **Error Detail:** {submitErrorDetail}
                  </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            {submitStatus === 'success' ? (
              <Button
                onClick={() => router.push('/')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Return to Home
              </Button>
            ) : submitStatus === 'error' ? (
              <Button
                onClick={handleRetrySubmit}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Retry Submission
              </Button>
            ) : null}
            
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              Home
            </Button>
          </div>

          {/* Note */}
          <div className="text-xs text-gray-500">
            {submitStatus === 'success' 
              ? 'You can safely close this window. Your submission has been recorded.'
              : 'Please do not close this window until submission is complete.'}
          </div>
        </div>
      </Card>
    </div>
  );
};
