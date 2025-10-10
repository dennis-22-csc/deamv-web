'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, BarChart3, UploadCloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'; 
import { Button } from '@/components/ui/Button';
import { CompletedQuizSession } from '../page';

interface QuizCompleteProps {
  sessionData: CompletedQuizSession;
}

export const QuizComplete: React.FC<QuizCompleteProps> = ({ sessionData }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>(
    sessionData.submitted ? 'success' : 'idle'
  );
  const [submitErrorDetail, setSubmitErrorDetail] = useState<string | null>(null);
  const hasSubmittedAttempt = useRef(false);

  // Calculations for summary and submission
  const totalQuestions = sessionData.questions.length;
  const answeredCount = Object.keys(sessionData.userAnswers).length;
  const totalTime = Math.round((sessionData.endTime - sessionData.startTime) / 1000); // in seconds

  useEffect(() => {
    let isMounted = true;

    const initialSubmit = () => {
      if (!sessionData.submitted && !hasSubmittedAttempt.current) {
        hasSubmittedAttempt.current = true;
        handleSubmitResults();
      }
    };

    // Auto-submit results when component mounts
    initialSubmit();

    return () => {
      isMounted = false;
    };
  }, [sessionData.submitted]);

  const handleSubmitResults = async () => {
    setIsSubmitting(true);
    setSubmitErrorDetail(null);

    try {
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

      const response = await fetch('/api/submit-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        try {
          const currentSession = sessionStorage.getItem('gradedQuizSession');
          if (currentSession) {
            const parsedSession = JSON.parse(currentSession);
            parsedSession.submitted = true;
            sessionStorage.setItem('gradedQuizSession', JSON.stringify(parsedSession));
          }
        } catch (storageError) {
          console.error("Failed to update session storage with 'submitted: true'.", storageError);
        }
        setSubmitStatus('success');
      } else {
        const status = response.status;
        let errorToDisplay = 'Submission failed due to an unknown API error.';
        if (status === 403) {
          try {
            const errorBody = await response.json();
            errorToDisplay = errorBody.error;
          } catch (e) {
            errorToDisplay = 'Authorization failed: Could not read error details from API.';
          }
        } else {
          const errorText = await response.text();
          errorToDisplay = `Submission failed: Status ${status}. Response: ${errorText.substring(0, 100)}`;
        }
        setSubmitErrorDetail(errorToDisplay);
        console.error('Submission failed details:', errorToDisplay);
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      if (!submitErrorDetail) {
        setSubmitErrorDetail(error instanceof Error ? error.message : 'Unknown network error');
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-xl animate-fade-in-up transform rounded-lg p-6 shadow-xl transition-all duration-500 ease-in-out sm:p-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            {submitStatus === 'success' ? (
              <CheckCircle className="h-10 w-10 text-green-500" />
            ) : submitStatus === 'error' ? (
              <UploadCloud className="h-10 w-10 text-red-500" />
            ) : (
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-purple-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {submitStatus === 'success'
              ? 'Quiz Submitted!'
              : submitStatus === 'error'
              ? 'Submission Failed'
              : 'Submitting Quiz...'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            {submitStatus === 'success'
              ? 'Your answers have been successfully submitted.'
              : submitStatus === 'error'
              ? 'There was an error submitting your quiz.'
              : 'Please wait while we submit your answers...'}
          </p>
        </div>

        {/* Quiz Summary - Adjusted for better responsiveness */}
        <div className="mb-8 grid grid-cols-1 gap-4 text-center sm:grid-cols-2">
          {/* Questions Answered Card */}
          <div className="rounded-xl border bg-white p-4 shadow-sm transition-transform duration-300 hover:scale-105">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-blue-500" />
            <div className="text-lg font-medium text-gray-600">Questions Answered</div>
            <div className="text-3xl font-bold text-blue-600">
              {answeredCount}/{totalQuestions}
            </div>
          </div>

          {/* Time Taken Card */}
          <div className="rounded-xl border bg-white p-4 shadow-sm transition-transform duration-300 hover:scale-105">
            <Clock className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <div className="text-lg font-medium text-gray-600">Time Taken</div>
            <div className="text-3xl font-bold text-green-600">{formatTime(totalTime)}</div>
          </div>
        </div>

        {/* Submission Status Alerts */}
        {submitStatus === 'success' && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-700">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Successfully submitted to server</span>
            </div>
            <p className="mt-2 text-sm text-green-600">
              Your registration code: <strong>{sessionData.registrationCode}</strong>
            </p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            <div className="flex items-center justify-center gap-2">
              <UploadCloud className="h-5 w-5" />
              <span className="font-semibold">Submission failed</span>
            </div>
            {submitErrorDetail && (
              <p className="mt-2 max-h-20 overflow-auto whitespace-pre-wrap break-words text-xs text-red-600">
                {submitErrorDetail}
              </p>
            )}
            <Button
              onClick={handleRetrySubmit}
              className="mt-4 w-full bg-orange-600 hover:bg-orange-700 sm:w-auto"
            >
              Retry Submission
            </Button>
          </div>
        )}

        {/* Action Buttons - Adjusted for better layout */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          {submitStatus === 'success' && (
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Return to Home
            </Button>
          )}

          {submitStatus !== 'error' && (
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Home
            </Button>
          )}
        </div>

        {/* Note at the bottom */}
        <div className="mt-6 text-center text-xs text-gray-500">
          {submitStatus === 'success'
            ? 'You can safely close this window. Your submission has been recorded.'
            : 'Please do not close this window until submission is complete.'}
        </div>
      </Card>
    </div>
  );
};
