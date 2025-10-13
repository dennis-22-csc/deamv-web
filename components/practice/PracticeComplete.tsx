'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, UploadCloud, CornerDownLeft, Repeat2, Database, Award, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { practiceDatabase, PracticeDataPayload, PendingUpload } from '@/lib/database';

const API_ENDPOINT = '/api/submit-practice-data';

// Helper function to check if category requires data submission
const requiresDataSubmission = (category: string): boolean => {
    return category.trim().toLowerCase().startsWith('class');
};

// Define a new type for the submission result
interface UploadResult {
    success: boolean;
    isUnauthorized: boolean; // <-- New flag
    errorMessage?: string;
}

// 1. UPDATED uploadPracticeData function
const uploadPracticeData = async (payload: PracticeDataPayload, useSheet: boolean = true): Promise<UploadResult> => {
    try {
        const sanitizedPayload = {
            ...payload,
            startTime: payload.startTime instanceof Date ? payload.startTime : new Date(payload.startTime),
            endTime: payload.endTime instanceof Date ? payload.endTime : new Date(payload.endTime)
        };

        const response = await fetch(`${API_ENDPOINT}?useSheet=${useSheet}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sanitizedPayload),
        });

        if (response.ok) {
            console.log("Practice Data successfully submitted to server:", sanitizedPayload);
            return { success: true, isUnauthorized: false };
        } else {
            const errorText = await response.text();
            console.error("Server API Submission Failed:", errorText);

            // Check if the server returned a 403 Forbidden status
            if (response.status === 403) {
                // Attempt to parse the JSON error body
                try {
                    const errorJson = JSON.parse(errorText);
                    // Check for the specific error message returned by your API route
                    if (errorJson.error === "Registration code not recognized by our partner institutions.") {
                        return { 
                            success: false, 
                            isUnauthorized: true, 
                            errorMessage: errorJson.error 
                        };
                    }
                } catch (e) {
                    console.warn("Could not parse JSON error response for 403 status:", e);
                }
            }
            
            // Default failure (network timeout, general server error, other 4xx/5xx)
            return { success: false, isUnauthorized: false, errorMessage: `Submission failed with status ${response.status}` };
        }
    } catch (error) {
        console.error("Network error during practice data submission:", error);
        // Network errors are considered general failures, not unauthorized errors
        return { success: false, isUnauthorized: false, errorMessage: 'Network or internal error' };
    }
};

interface PracticeCompleteProps {
    sessionData: PracticeDataPayload;
}

// Simple reusable component for stats display
const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition duration-300 ease-in-out hover:shadow-md hover:border-indigo-300">
        <span className="text-gray-600 font-medium text-base mb-1 sm:mb-0">{label}</span>
        <span className="text-xl font-extrabold text-indigo-600 mt-0.5 sm:mt-0">{value}</span>
    </div>
);

// 2. UPDATED PracticeComplete component
export const PracticeComplete: React.FC<PracticeCompleteProps> = ({ sessionData }) => {
    const router = useRouter();
    const [registrationCode, setRegistrationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'initial' | 'success' | 'failed' | 'persisted' | 'unauthorized'>('initial');
    const [submissionError, setSubmissionError] = useState(''); 
    const [pendingUploadCount, setPendingUploadCount] = useState(0);

    const currentCategoryRequiresSubmission = useMemo(() => {
        return requiresDataSubmission(sessionData.category);
    }, [sessionData.category]);

    // Calculate Summary Stats
    const stats = useMemo(() => {
        const completedChallenges = sessionData.attempts.filter(a => a.trials > 0);
        const totalQuestionsCompleted = completedChallenges.length;
        const totalDontKnows = sessionData.attempts.filter(a => a.showAnswerClicked).length;
        const totalFirstTrialSuccess = completedChallenges.filter(a => a.gotOnFirstTrial).length;

        const retriedChallenges = completedChallenges.filter(a => a.trials > 1);
        const totalRetrialTrials = retriedChallenges.reduce((sum, a) => sum + (a.trials - 1), 0);
        const avgTrialsForRetries = retriedChallenges.length > 0
            ? (totalRetrialTrials / retriedChallenges.length) + 1
            : 1;

        return {
            totalQuestionsCompleted,
            totalDontKnows,
            totalFirstTrialSuccess,
            retriedChallengesCount: retriedChallenges.length,
            avgTrialsForRetries: avgTrialsForRetries.toFixed(2),
        };
    }, [sessionData]);

    // Fix date objects in sessionData to ensure they're proper Date objects
    const fixedSessionData: PracticeDataPayload = useMemo(() => {
        return {
            ...sessionData,
            startTime: sessionData.startTime instanceof Date ? sessionData.startTime : new Date(sessionData.startTime),
            endTime: sessionData.endTime instanceof Date ? sessionData.endTime : new Date(sessionData.endTime),
            attempts: sessionData.attempts.map(attempt => ({
                ...attempt,
                timestamp: attempt.timestamp ? (attempt.timestamp instanceof Date ? attempt.timestamp : new Date(attempt.timestamp)) : new Date(),
            }))
        };
    }, [sessionData]);


    // --- Data Submission and Retry Logic ---

    // Initial check and setup background worker
    const checkPendingUploads = useCallback(async () => {
        const allPending = await practiceDatabase.getPendingUploads() as PendingUpload[];
        const classPending = Array.isArray(allPending)
            ? allPending.filter(upload =>
                requiresDataSubmission(upload.payload.category)
            )
            : [];
        setPendingUploadCount(classPending.length);
    }, []);

    // Background Retry Worker
    const processPendingUploads = useCallback(async () => {
        const allPendingUploads = await practiceDatabase.getPendingUploads() as PendingUpload[];
        const classPendingUploads = Array.isArray(allPendingUploads)
            ? allPendingUploads.filter(upload =>
                requiresDataSubmission(upload.payload.category)
            )
            : [];

        setPendingUploadCount(classPendingUploads.length);

        for (const upload of classPendingUploads) {
            if (upload.status === 'PENDING' || upload.status === 'FAILED') {
                if (upload.attempts >= 5) continue;

                const finalPayload = upload.payload;

                try {
                    const result = await uploadPracticeData(finalPayload);

                    if (result.success) {
                        await practiceDatabase.removePendingUpload(upload.id);
                        console.log(`Pending upload ${upload.id} successfully processed and removed.`);
                    } else if (result.isUnauthorized) {
                        // If UNAUTHORIZED error occurs on a retry, REMOVE the data (it's invalid)
                        await practiceDatabase.removePendingUpload(upload.id);
                        console.warn(`Pending upload ${upload.id} failed due to unauthorized code. Data removed from pending queue.`);
                    } else {
                        // Failed again (general error)
                        await practiceDatabase.updatePendingUpload({
                            ...upload,
                            attempts: upload.attempts + 1,
                            lastAttempt: new Date(),
                            status: 'FAILED'
                        });
                    }
                } catch (error) {
                    // Network error during retry
                    await practiceDatabase.updatePendingUpload({
                        ...upload,
                        attempts: upload.attempts + 1,
                        lastAttempt: new Date(),
                        status: 'FAILED'
                    });
                }
            }
        }

        // Clean up non-Class pending uploads
        const nonClassPendingUploads = Array.isArray(allPendingUploads)
            ? allPendingUploads.filter(upload =>
                !requiresDataSubmission(upload.payload.category)
            )
            : [];

        for (const upload of nonClassPendingUploads) {
            await practiceDatabase.removePendingUpload(upload.id);
        }

        await checkPendingUploads();
    }, [checkPendingUploads]);
    
    // Initial Submit (or Retry from UI)
    const handleSubmitData = async (code: string, data: PracticeDataPayload) => {
        if (!requiresDataSubmission(data.category)) {
            console.log(`Skipping submission for non-Class category: ${data.category}`);
            setSubmissionStatus('success');
            return;
        }

        if (submissionStatus === 'initial' && !code.trim()) {
            console.warn("Registration code is required.");
            return;
        }

        setIsSubmitting(true);
        setSubmissionError(''); // Clear previous errors
        const finalPayload = { ...data, registrationCode: code.trim() || null };

        try {
            const result = await uploadPracticeData(finalPayload); // Get the structured result

            if (result.success) {
                // SUCCESS - Remove any old pending state if it exists (though unlikely for a new submission)
                const existingPending = await practiceDatabase.getPendingUploads() as PendingUpload[];
                const currentSessionPending = existingPending.find(p => 
                    p.payload.startTime.getTime() === data.startTime.getTime() && 
                    p.payload.category === data.category
                );
                if (currentSessionPending) {
                    await practiceDatabase.removePendingUpload(currentSessionPending.id);
                    console.log('Successfully submitted and removed corresponding pending upload.');
                }
                setSubmissionStatus('success');
            } else if (result.isUnauthorized) {
                // If UNAUTHORIZED, DO NOT PERSIST, and REMOVE any existing pending upload for this session
                const existingPending = await practiceDatabase.getPendingUploads() as PendingUpload[];
                const currentSessionPending = existingPending.find(p => 
                    p.payload.startTime.getTime() === data.startTime.getTime() && 
                    p.payload.category === data.category
                );
                if (currentSessionPending) {
                    await practiceDatabase.removePendingUpload(currentSessionPending.id);
                    await checkPendingUploads(); // Update count immediately
                    console.warn('Unauthorized code used. Removed corresponding pending upload to stop retries.');
                }
                
                setSubmissionStatus('unauthorized');
                setSubmissionError(result.errorMessage || "Registration code not recognized.");
            } else {
                // General Server/Network Failure -> Persist locally
                await practiceDatabase.addPendingUpload(finalPayload);
                setSubmissionStatus('persisted');
                await checkPendingUploads();
            }
        } catch (error) {
            console.error('Submission failed due to network error:', error);
            // Network error -> Persist locally
            await practiceDatabase.addPendingUpload(finalPayload);
            setSubmissionStatus('persisted');
            await checkPendingUploads();
        } finally {
            setIsSubmitting(false);
        }
    };


    useEffect(() => {
        if (sessionData.registrationCode && submissionStatus === 'initial') {
            setRegistrationCode(sessionData.registrationCode);
        }

        checkPendingUploads();

        const retryInterval = setInterval(() => {
            processPendingUploads();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(retryInterval);
    }, [sessionData, checkPendingUploads, processPendingUploads, submissionStatus]);

    // 3. UPDATED renderSubmissionContent function
    // This is defined before it's used in renderCompletionMessage
    const renderSubmissionContent = () => {
        const isSubmitDisabled = isSubmitting || !registrationCode.trim();

        switch (submissionStatus) {
            case 'success':
                return (
                    <div className="text-center space-y-4">
                        <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
                        <h3 className="text-2xl font-bold text-green-700">Data Submitted Successfully!</h3>
                        <p className="text-gray-600 max-w-sm mx-auto">Your practice data has been securely logged on the server.</p>
                    </div>
                );
            case 'unauthorized':
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-4">
                            <AlertTriangle className="h-14 w-14 text-red-600 mx-auto" />
                            <h3 className="text-2xl font-bold text-red-700">Submission Failed!</h3>
                            <p className="text-red-500 font-semibold max-w-sm mx-auto">
                                {submissionError || "The registration code was not recognized. Please re-enter a valid code to submit this session."}
                            </p>
                        </div>
                        {/* Input field for re-entry */}
                        <Input
                            id="reg-code-retry"
                            type="text"
                            value={registrationCode}
                            onChange={(e) => {
                                setRegistrationCode(e.target.value);
                                // Reset status back to 'initial' when the user starts typing
                                setSubmissionStatus('initial');
                                setSubmissionError('');
                            }}
                            placeholder="Enter corrected code"
                            className="text-lg p-3 w-full border-red-400 focus:border-red-600"
                            disabled={isSubmitting}
                        />
                        <Button
                            onClick={() => handleSubmitData(registrationCode, fixedSessionData)}
                            disabled={isSubmitDisabled}
                            className="w-full text-lg py-3 bg-red-600 hover:bg-red-700"
                            size="lg"
                        >
                            {isSubmitting ? 'Resubmitting...' : 'Resubmit with New Code'}
                        </Button>
                    </div>
                );
            case 'failed':
            case 'persisted':
                return (
                    <div className="text-center space-y-4">
                        <Database className="h-14 w-14 text-orange-500 mx-auto" />
                        <h3 className="text-2xl font-bold text-orange-700">Saved Locally. Retrying...</h3>
                        <p className="text-gray-600 max-w-sm mx-auto">The server connection failed. Your data is safely stored on this device and will be uploaded automatically when possible. </p>
                    </div>
                );
            case 'initial':
            default:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <label htmlFor="reg-code" className="block text-xl font-bold text-gray-800">
                                Enter Your Registration Code
                            </label>
                            <p className="text-sm text-gray-500 mt-1">
                                This code links your practice data to your account for tracking progress.
                            </p>
                        </div>
                        <Input
                            id="reg-code"
                            type="text"
                            value={registrationCode}
                            onChange={(e) => setRegistrationCode(e.target.value)}
                            placeholder="e.g., 89052035-191311"
                            className="text-lg p-3 w-full"
                            disabled={isSubmitting}
                        />
                        <Button
                            onClick={() => handleSubmitData(registrationCode, fixedSessionData)}
                            disabled={isSubmitDisabled}
                            className="w-full text-lg py-3"
                            size="lg"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Practice Data'}
                        </Button>
                        {!registrationCode.trim() && (
                            <p className="text-sm text-red-500 text-center">
                                Please enter your Registration Code to submit data.
                            </p>
                        )}
                    </div>
                );
        }
    };
    
    // The function that was causing the error, now properly defined here.
    const renderCompletionMessage = () => {
        if (currentCategoryRequiresSubmission) {
            return (
                <>
                    {/* DATA SUBMISSION & STATUS */}
                    <div className="p-8 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                        {renderSubmissionContent()}
                    </div>

                    {/* Pending Upload Indicator (Only shown if NOT success/unauthorized) */}
                    {pendingUploadCount > 0 && submissionStatus !== 'success' && submissionStatus !== 'unauthorized' && (
                        <div className="text-center text-sm text-orange-600 flex items-center justify-center gap-2 mt-4">
                            <Repeat2 className="h-4 w-4 animate-spin-slow" />
                            {pendingUploadCount} Class submission{pendingUploadCount > 1 ? 's' : ''} pending and will be retried automatically.
                        </div>
                    )}
                </>
            );
        } else {
            return (
                <div className="text-center space-y-6 p-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-lg">
                    <Award className="h-16 w-16 text-blue-500 mx-auto" />
                    <h3 className="text-3xl font-extrabold text-blue-800">Practice Session Complete!</h3>
                    <p className="text-lg text-blue-700 max-w-2xl mx-auto">
                        Great job completing the <strong>{fixedSessionData.category}</strong> challenges!
                        Your progress has been recorded locally.
                    </p>
                    <div className="bg-white rounded-lg p-4 max-w-sm mx-auto border border-gray-200">
                        <p className="text-sm text-gray-600">
                            <strong>Note:</strong> Data submission is only required for Class categories.
                            For other categories, your progress is saved on this device.
                        </p>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 lg:py-20">
                <Card className="p-6 sm:p-10 space-y-8 sm:space-y-10 rounded-xl shadow-2xl">
                    <div className="text-center space-y-4">
                        <CheckCircle className="h-16 w-16 text-indigo-600 mx-auto" />
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Session Complete!</h1>
                        <p className="text-lg sm:text-xl text-gray-600 max-w-lg mx-auto">
                            Congratulations on finishing all the <b>{fixedSessionData.category}</b> challenges.
                        </p>
                        {currentCategoryRequiresSubmission && (
                            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 max-w-sm mx-auto shadow-sm">
                                <p className="text-sm text-yellow-800 font-semibold">
                                    <UploadCloud className="h-4 w-4 inline mr-1 text-yellow-600" />
                                    <strong>Class Session:</strong> Please submit your data to track your progress.
                                </p>
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-200" />

                    {/* STATS SUMMARY */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800 text-center">Performance Summary</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StatItem label="Questions Completed" value={stats.totalQuestionsCompleted} />
                            <StatItem label="Time Spent (min)" value={(fixedSessionData.totalTimeSeconds / 60).toFixed(1)} />
                            <StatItem label="First-Try Successes" value={stats.totalFirstTrialSuccess} />
                            <StatItem label="Questions Retried" value={stats.retriedChallengesCount} />
                            <StatItem label="Used 'Show Answer'" value={stats.totalDontKnows} />
                            <StatItem label="Avg. Trials (on retries)" value={stats.avgTrialsForRetries} />
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* CONDITIONAL DATA SUBMISSION OR COMPLETION MESSAGE */}
                    {renderCompletionMessage()}

                    {/* NAVIGATION */}
                    <div className="pt-4 flex justify-center">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/category-selection')}
                            className="flex items-center gap-2 text-lg px-6 py-3 border-2 border-indigo-300 hover:bg-indigo-50 transition duration-150"
                        >
                            <CornerDownLeft className="h-5 w-5" />
                            Back to Categories
                        </Button>
                    </div>
                </Card>
            </main>
        </div>
    );
};
