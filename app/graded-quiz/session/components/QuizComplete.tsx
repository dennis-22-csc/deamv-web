// app/graded-quiz/session/components/QuizComplete.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, BarChart3, UploadCloud, AlertCircle, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CompletedQuizSession } from '../page';

interface QuizCompleteProps {
  sessionData: CompletedQuizSession;
}

export const QuizComplete: React.FC<QuizCompleteProps> = ({ sessionData }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitErrorDetail, setSubmitErrorDetail] = useState<string | null>(null);
  const [showRegistrationInput, setShowRegistrationInput] = useState(false);
  const [registrationCode, setRegistrationCode] = useState(sessionData.registrationCode);
  const hasSubmittedAttempt = useRef(false);
  const [localSessionData, setLocalSessionData] = useState(sessionData);

  // Constants for error types
  const NO_ANSWERS_ERROR = 'NO_ANSWERS_SUBMITTED';
  const DUPLICATE_SUBMISSION_MESSAGE = 'Record already exist for registration code';

  // Calculations for summary and submission
  const totalQuestions = localSessionData.questions.length;
  const answeredCount = Object.keys(localSessionData.userAnswers).length;
  const totalTime = Math.round((localSessionData.endTime - localSessionData.startTime) / 1000);

  useEffect(() => {
    console.log('🔍 useEffect triggered - checking submission conditions');
    let isMounted = true;

    const initialSubmit = async () => {
      // 1. Check for zero answers
      if (answeredCount === 0) {
        if (!hasSubmittedAttempt.current) {
          console.log('🛑 Cannot auto-submit: No questions were answered.');
          setSubmitErrorDetail(NO_ANSWERS_ERROR);
          setSubmitStatus('error');
          hasSubmittedAttempt.current = true;
        }
        return;
      }

      if (!hasSubmittedAttempt.current && answeredCount > 0) {
        hasSubmittedAttempt.current = true;
        await handleSubmitResults();
      } else {
        if (localSessionData.submitted && !hasSubmittedAttempt.current) {
          setSubmitStatus('success');
          hasSubmittedAttempt.current = true;
        }
      }
    };

    initialSubmit();

    return () => {
      isMounted = false;
    };
  }, [localSessionData.submitted, answeredCount]);

  const handleSubmitResults = async (overrideRegistrationCode?: string) => {
    setIsSubmitting(true);
    setSubmitErrorDetail(null);
    setShowRegistrationInput(false);

    // Check for zero answers
    if (answeredCount === 0) {
      console.log('🛑 Submission blocked: Answered count is 0.');
      setIsSubmitting(false);
      setSubmitErrorDetail(NO_ANSWERS_ERROR);
      setSubmitStatus('error');
      hasSubmittedAttempt.current = true;
      return;
    }

    try {
      const submissionData = {
        registrationCode: overrideRegistrationCode || registrationCode,
        sessionId: `quiz-${localSessionData.startTime}`,
        startTime: new Date(localSessionData.startTime).toISOString(),
        endTime: new Date(localSessionData.endTime).toISOString(),
        totalTime,
        totalQuestions,
        answeredCount,
        answers: localSessionData.userAnswers,
        questions: localSessionData.questions,
      };

      console.log('📤 Submitting quiz data:', {
        registrationCode: submissionData.registrationCode,
        answeredCount: submissionData.answeredCount,
        totalQuestions: submissionData.totalQuestions,
        answersKeys: Object.keys(submissionData.answers),
        sessionId: submissionData.sessionId
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const apiUrl = process.env.NODE_ENV === 'development'
        ? `${window.location.origin}/api/submit-quiz`
        : '/api/submit-quiz';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(submissionData),
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      console.log('📥 Received response status:', response.status);

      const responseText = await response.text();

      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 200)}`);
      }

      if (response.ok) {
        console.log('✅ Submission successful');
        // Update local state and session storage with new registration code if it was changed
        try {
          const updatedSessionData = {
            ...localSessionData,
            submitted: true,
            registrationCode: overrideRegistrationCode || registrationCode
          };
          setLocalSessionData(updatedSessionData);
          setRegistrationCode(overrideRegistrationCode || registrationCode);

          const currentSession = sessionStorage.getItem('gradedQuizSession');
          if (currentSession) {
            const parsedSession = JSON.parse(currentSession);
            parsedSession.submitted = true;
            parsedSession.registrationCode = overrideRegistrationCode || registrationCode;
            sessionStorage.setItem('gradedQuizSession', JSON.stringify(parsedSession));
          }
        } catch (storageError) {
          console.error("❌ Failed to update session storage:", storageError);
        }

        setSubmitStatus('success');
      } else {
        const status = response.status;
        console.error('❌ API returned error status:', status);

        let errorToDisplay = 'Submission failed due to an unknown API error.';

        if (status === 403) {
          errorToDisplay = responseData.error || 'Authorization failed. Please check your registration code.';
          // Show registration input for 403 errors
          setShowRegistrationInput(true);
        } else if (status === 404) {
          errorToDisplay = 'API endpoint not found. Please check if the server is running.';
        } else if (status == 409) {
          errorToDisplay = DUPLICATE_SUBMISSION_MESSAGE;
        } else if (status >= 500) {
          errorToDisplay = 'Server error. Please try again later.';
        } else {
          errorToDisplay = responseData.error || responseData.message || `Submission failed with status ${status}`;
        }

        setSubmitErrorDetail(errorToDisplay);
        setSubmitStatus('error');
        hasSubmittedAttempt.current = false;
      }

    } catch (error) {
      console.error('❌ Error submitting quiz:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout - submission took too long. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      setSubmitErrorDetail(errorMessage);
      setSubmitStatus('error');
      hasSubmittedAttempt.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrySubmit = () => {
    setSubmitStatus('idle');
    setSubmitErrorDetail(null);

    // If we have a registration input showing, use that value
    if (showRegistrationInput && registrationCode.trim()) {
      handleSubmitWithNewCode();
    } else {
      handleSubmitResults();
    }
  };

  const handleSubmitWithNewCode = () => {
    if (!registrationCode.trim()) {
      setSubmitErrorDetail('Please enter a valid registration code');
      return;
    }
    // Clear error state and show submitting state immediately
    setSubmitStatus('idle');
    setSubmitErrorDetail(null);
    setShowRegistrationInput(false);
    setIsSubmitting(true);

    handleSubmitResults(registrationCode);
  };

  const handleManualSubmit = () => {
    console.log('🔄 Manual submission triggered');
    hasSubmittedAttempt.current = false;
    setSubmitStatus('idle');
    setSubmitErrorDetail(null);
    setShowRegistrationInput(true);
  };

  const handleForceSubmit = () => {
    console.log('🔄 Force submission with current data');
    hasSubmittedAttempt.current = false;
    handleSubmitResults();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  // Helper to check if the current error is due to zero answers
  const isZeroAnswerError = submitStatus === 'error' && submitErrorDetail === NO_ANSWERS_ERROR;

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
            ) : isSubmitting ? (
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-purple-600" />
            ) : (
              <BarChart3 className="h-10 w-10 text-blue-500" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {submitStatus === 'success'
              ? 'Quiz Submitted! 🎉'
              : submitStatus === 'error'
              ? isZeroAnswerError
                ? 'Submission Required'
                : 'Submission Failed'
              : isSubmitting
              ? 'Submitting Quiz...'
              : 'Ready to Submit'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            {submitStatus === 'success'
              ? 'Your answers have been successfully submitted.'
              : submitStatus === 'error'
              ? isZeroAnswerError
                ? 'You must answer at least one question before submitting.'
                : 'There was an error submitting your quiz.'
              : isSubmitting
              ? 'Please wait while we submit your answers...'
              : 'Your quiz is ready to be submitted.'}
          </p>
        </div>

        {/* Quiz Summary */}
        <div className="mb-8 grid grid-cols-1 gap-4 text-center sm:grid-cols-2">
          <div className={`rounded-xl border ${answeredCount === 0 ? 'border-red-300' : 'border-gray-200'} bg-white p-4 shadow-sm transition-transform duration-300 hover:scale-105`}>
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-blue-500" />
            <div className="text-lg font-medium text-gray-600">Questions Answered</div>
            <div className={`text-3xl font-bold ${answeredCount === 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {answeredCount}/{totalQuestions}
            </div>
            {answeredCount === 0 && (
              <div className="mt-2 text-xs text-red-500">
                Submission requires at least one answer.
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm transition-transform duration-300 hover:scale-105">
            <Clock className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <div className="text-lg font-medium text-gray-600">Time Taken</div>
            <div className="text-3xl font-bold text-green-600">{formatTime(totalTime)}</div>
          </div>
        </div>

        {/* Registration Code Input for Errors - Enhanced with resubmit button */}
        {showRegistrationInput && submitStatus === 'error' && !isZeroAnswerError && !isSubmitting && (
          <div className="mb-6 rounded-lg border border-orange-300 bg-orange-50 p-4 shadow-md">
            <div className="text-left">
              <label htmlFor="registrationCode" className="block text-sm font-semibold text-orange-800 mb-2">
                Registration Code Required <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <Input
                  id="registrationCode"
                  type="text"
                  value={registrationCode}
                  onChange={(e) => setRegistrationCode(e.target.value)}
                  placeholder="Enter your corrected registration code"
                  className="text-lg font-mono py-2 flex-grow focus:border-orange-500 border-orange-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitWithNewCode();
                    }
                  }}
                />
                <Button
                  onClick={handleSubmitWithNewCode}
                  className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                  disabled={isSubmitting || !registrationCode.trim()}
                >
                  <UploadCloud className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Resubmit'}
                </Button>
              </div>
              <p className="text-orange-700 text-sm mt-2 flex items-start gap-2">
                <Edit className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Please correct your registration code and click "Resubmit"</span>
              </p>
            </div>
          </div>
        )}

        {/* Submission Status Alerts */}
        {submitStatus === 'success' && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-700">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Successfully submitted to server</span>
            </div>
            <p className="mt-2 text-sm text-green-600">
              Your registration code: <strong>{localSessionData.registrationCode}</strong>
            </p>
          </div>
        )}

        {/* Error Status Alert - Only show when not submitting */}
        {submitStatus === 'error' && !isSubmitting && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            <div className="flex items-center justify-center gap-2">
              <UploadCloud className="h-5 w-5" />
              <span className="font-semibold">{isZeroAnswerError ? 'Submission Blocked' : 'Submission failed'}</span>
            </div>
            {submitErrorDetail && !isZeroAnswerError && (
              <p className="mt-2 max-h-20 overflow-auto whitespace-pre-wrap break-words text-xs text-red-600">
                {submitErrorDetail}
              </p>
            )}
            {isZeroAnswerError && (
              <p className="mt-2 text-sm text-red-600">
                You cannot submit a quiz with zero answers. Please return to the quiz to answer at least one question.
              </p>
            )}

            {/* Action Buttons for Error State */}
            {!showRegistrationInput && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {isZeroAnswerError ? (
                  // If zero answers, offer to go back to quiz
                  <Button
                    onClick={() => router.push('/graded-quiz/start')}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isSubmitting}
                  >
                    Return to Quiz
                  </Button>
                ) : (
                  // If it's another error (like connection/server), offer to retry
                  <Button
                    onClick={handleRetrySubmit}
                    className="bg-yellow-600 hover:bg-yellow-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Retrying...' : 'Retry Submission'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons (General) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          {submitStatus === 'idle' && !isSubmitting && (
            <Button
              onClick={handleForceSubmit}
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
            >
              Submit Quiz Now
            </Button>
          )}

          {submitStatus === 'success' && (
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Return to Home
            </Button>
          )}

          {(submitStatus === 'idle' || submitStatus === 'error') && !showRegistrationInput && !isSubmitting && !isZeroAnswerError && (
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Return to Home
            </Button>
          )}
        </div>

        {/* Note at the bottom */}
        <div className="mt-6 text-center text-xs text-gray-500">
          {submitStatus === 'success'
            ? 'You can safely close this window. Your submission has been recorded.'
            : isZeroAnswerError
            ? 'Return to the quiz to answer questions before attempting to submit again.'
            : 'Please do not close this window until submission is complete.'}
        </div>
      </Card>
    </div>
  );
};
