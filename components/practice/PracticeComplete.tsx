// components/practice/PracticeComplete.tsx

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react'; 
import { useRouter } from 'next/navigation';
import { CheckCircle, UploadCloud, CornerDownLeft, Repeat2, Database, Award } from 'lucide-react';
import { Button } from '@/components/ui/Button'; 
import { Card } from '@/components/ui/Card';
import Input  from '@/components/ui/Input';
import { PracticeDataPayload, addPendingUpload, removePendingUpload, updatePendingUpload, getPendingUploads, PendingUpload } from '@/lib/database';

const API_ENDPOINT = '/api/submit-practice-data';

// Helper function to check if category requires data submission
const requiresDataSubmission = (category: string): boolean => {
    return category.trim().toLowerCase().startsWith('class');
};

const uploadPracticeData = async (payload: PracticeDataPayload, useSheet: boolean = true): Promise<boolean> => {
    try {
        // Ensure dates are properly formatted before sending
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
            return true;
        } else {
            console.error("Server API Submission Failed:", await response.text());
            return false;
        }
    } catch (error) {
        console.error("Network error during practice data submission:", error);
        return false;
    }
};

interface PracticeCompleteProps {
    sessionData: PracticeDataPayload;
}

export const PracticeComplete: React.FC<PracticeCompleteProps> = ({ sessionData }) => {
    const router = useRouter();
    const [registrationCode, setRegistrationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'initial' | 'success' | 'failed' | 'persisted'>('initial');
    const [pendingUploadCount, setPendingUploadCount] = useState(0);

    // Check if current category requires data submission (starts with "Class")
    const currentCategoryRequiresSubmission = useMemo(() => {
        return requiresDataSubmission(sessionData.category);
    }, [sessionData.category]);

    // Calculate Summary Stats from the sessionData (Performance intensive calculations are memoized)
    const stats = useMemo(() => {
        const completedChallenges = sessionData.attempts.filter(a => a.trials > 0);
        const totalQuestionsCompleted = completedChallenges.length;
        const totalDontKnows = sessionData.attempts.filter(a => a.showAnswerClicked).length;
        const totalFirstTrialSuccess = completedChallenges.filter(a => a.gotOnFirstTrial).length;

        // Calculate average trials for questions *not* gotten on the first try
        const retriedChallenges = completedChallenges.filter(a => a.trials > 1);
        const totalRetrialTrials = retriedChallenges.reduce((sum, a) => sum + (a.trials - 1), 0);
        const avgTrialsForRetries = retriedChallenges.length > 0
            ? (totalRetrialTrials / retriedChallenges.length) + 1 // +1 for the first failed attempt
            : 1; // 1 means no retries were needed

        return {
            totalQuestionsCompleted,
            totalDontKnows,
            totalFirstTrialSuccess,
            retriedChallengesCount: retriedChallenges.length,
            avgTrialsForRetries: avgTrialsForRetries.toFixed(2),
        };
    }, [sessionData]);

    // Fix date objects in sessionData to ensure they're proper Date objects
    const fixedSessionData = useMemo(() => {
        return {
            ...sessionData,
            startTime: sessionData.startTime instanceof Date ? sessionData.startTime : new Date(sessionData.startTime),
            endTime: sessionData.endTime instanceof Date ? sessionData.endTime : new Date(sessionData.endTime),
            // Also fix any dates in attempts if needed
            attempts: sessionData.attempts.map(attempt => ({
                ...attempt,
                // Fix any date fields in attempts if they exist
                timestamp: attempt.timestamp ? (attempt.timestamp instanceof Date ? attempt.timestamp : new Date(attempt.timestamp)) : undefined,
            }))
        };
    }, [sessionData]);

    // --- Data Submission and Retry Logic ---

    // 1. Initial Submit (or Retry from UI)
    const handleSubmitData = async (code: string, data: PracticeDataPayload) => {
        // Only submit if category requires data submission
        if (!requiresDataSubmission(data.category)) {
            console.log(`Skipping submission for non-Class category: ${data.category}`);
            setSubmissionStatus('success'); // Mark as success since no submission needed
            return;
        }

        // Enforce non-empty code if submissionStatus is 'initial'
        if (submissionStatus === 'initial' && !code.trim()) {
            console.warn("Registration code is required.");
            return;
        }

        setIsSubmitting(true);
        // Ensure code is not null/empty string if we proceed
        const finalPayload = { ...data, registrationCode: code.trim() || null }; 

        try {
            const success = await uploadPracticeData(finalPayload);
            
            if (success) {
                setSubmissionStatus('success');
            } else {
                // Server failed -> Persist locally
                await addPendingUpload(finalPayload);
                setSubmissionStatus('persisted');
                await checkPendingUploads(); // Update count
            }
        } catch (error) {
            console.error('Submission failed due to network error:', error);
            // Network error -> Persist locally
            await addPendingUpload(finalPayload);
            setSubmissionStatus('persisted');
            await checkPendingUploads(); // Update count
        } finally {
            setIsSubmitting(false);
        }
    };

    // 3. Initial check and setup background worker
    const checkPendingUploads = useCallback(async () => {
        const allPending = await getPendingUploads();
        // Only count pending uploads for Class categories
        const classPending = allPending.filter(upload => 
            requiresDataSubmission(upload.payload.category)
        );
        setPendingUploadCount(classPending.length);
    }, []);
    
    // 2. Background Retry Worker - Only retry Class categories
    const processPendingUploads = useCallback(async () => {
        const allPendingUploads = await getPendingUploads();
        
        // Filter to only Class categories
        const classPendingUploads = allPendingUploads.filter(upload => 
            requiresDataSubmission(upload.payload.category)
        );
        
        setPendingUploadCount(classPendingUploads.length);

        for (const upload of classPendingUploads) {
            if (upload.status === 'PENDING' || upload.status === 'FAILED') {
                // Simple exponential backoff logic (e.g., limit to 5 attempts)
                if (upload.attempts >= 5) continue; 
                
                // Use the code already in the payload for retries
                const finalPayload = upload.payload;
                
                try {
                    const success = await uploadPracticeData(finalPayload);

                    if (success) {
                        await removePendingUpload(upload.id);
                        console.log(`Pending upload ${upload.id} successfully processed and removed.`);
                    } else {
                        // Failed again
                        await updatePendingUpload({ 
                            ...upload, 
                            attempts: upload.attempts + 1, 
                            lastAttempt: new Date(),
                            status: 'FAILED' 
                        });
                    }
                } catch (error) {
                    // Network error during retry
                    await updatePendingUpload({ 
                        ...upload, 
                        attempts: upload.attempts + 1, 
                        lastAttempt: new Date(),
                        status: 'FAILED' 
                    });
                }
            }
        }
        
        // Clean up non-Class pending uploads (they don't need to be retried)
        const nonClassPendingUploads = allPendingUploads.filter(upload => 
            !requiresDataSubmission(upload.payload.category)
        );
        
        for (const upload of nonClassPendingUploads) {
            console.log(`Cleaning up non-Class pending upload: ${upload.payload.category}`);
            await removePendingUpload(upload.id);
        }
        
        await checkPendingUploads(); // Update count after processing
    }, [checkPendingUploads]); 

    useEffect(() => {
        // If sessionData already has a code (e.g., passed from a previous login state), use it.
        if (sessionData.registrationCode && submissionStatus === 'initial') {
            setRegistrationCode(sessionData.registrationCode);
        } 
        
        checkPendingUploads();

        const retryInterval = setInterval(() => {
            processPendingUploads();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(retryInterval); 
    }, [sessionData, checkPendingUploads, processPendingUploads, submissionStatus]);

    const renderSubmissionContent = () => {
        const isSubmitDisabled = isSubmitting || !registrationCode.trim();

        switch (submissionStatus) {
            case 'success':
                return (
                    <div className="text-center space-y-4">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                        <h3 className="text-2xl font-semibold text-green-700">Data Submitted Successfully!</h3>
                        <p className="text-gray-600">Your practice data has been securely logged on the server.</p>
                    </div>
                );
            case 'failed':
                return (
                    <div className="text-center space-y-4">
                        <UploadCloud className="h-12 w-12 text-red-500 mx-auto" />
                        <h3 className="text-2xl font-semibold text-red-700">Submission Failed.</h3>
                        <p className="text-gray-600">A network error occurred. Your data has been saved locally and will be retried.</p>
                    </div>
                );
            case 'persisted':
                return (
                    <div className="text-center space-y-4">
                        <Database className="h-12 w-12 text-orange-500 mx-auto" />
                        <h3 className="text-2xl font-semibold text-orange-700">Saved Locally. Retrying...</h3>
                        <p className="text-gray-600">The server connection failed. Your data is safely stored on this device and will be uploaded automatically when possible. </p>
                    </div>
                );
            case 'initial':
            default:
                return (
                    <div className="space-y-4">
                        <label htmlFor="reg-code" className="block text-lg font-medium text-gray-700">
                            Enter Your Registration Code
                        </label>
                        <p className="text-sm text-gray-500">
                            This code links your practice data to your account for tracking progress.
                        </p>
                        <Input
                            id="reg-code"
                            type="text"
                            value={registrationCode}
                            onChange={(e) => setRegistrationCode(e.target.value)}
                            placeholder="e.g., 89052035-191311"
                            className="text-lg"
                            disabled={isSubmitting}
                        />
                        <Button
                            onClick={() => handleSubmitData(registrationCode, fixedSessionData)} 
                            disabled={isSubmitDisabled}
                            className="w-full"
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

    const renderCompletionMessage = () => {
        if (currentCategoryRequiresSubmission) {
            return (
                <>
                    {/* DATA SUBMISSION & STATUS */}
                    <div className="p-6 bg-gray-50 rounded-lg border">
                        {renderSubmissionContent()}
                    </div>
                    
                    {/* Pending Upload Indicator */}
                    {pendingUploadCount > 0 && submissionStatus !== 'success' && (
                        <div className="text-center text-sm text-orange-600 flex items-center justify-center gap-2 mt-4">
                            <Repeat2 className="h-4 w-4 animate-spin-slow" />
                            {pendingUploadCount} Class submission{pendingUploadCount > 1 ? 's' : ''} pending and will be retried automatically.
                        </div>
                    )}
                </>
            );
        } else {
            return (
                <div className="text-center space-y-6 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <Award className="h-16 w-16 text-blue-500 mx-auto" />
                    <h3 className="text-2xl font-bold text-blue-800">Practice Session Complete!</h3>
                    <p className="text-lg text-blue-700 max-w-2xl mx-auto">
                        Great job completing the <strong>{fixedSessionData.category}</strong> challenges! 
                        Your progress has been recorded locally.
                    </p>
                    <div className="bg-white rounded-lg p-4 max-w-md mx-auto border">
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
            <main className="max-w-4xl mx-auto px-4 py-12">
                <Card className="p-10 space-y-10">
                    <div className="text-center space-y-4">
                        <CheckCircle className="h-16 w-16 text-indigo-500 mx-auto" />
                        <h1 className="text-4xl font-extrabold text-gray-900">Practice Complete!</h1>
                        <p className="text-xl text-gray-600">
                            Congratulations on finishing all the <b>{fixedSessionData.category}</b> challenges.
                        </p>
                        {currentCategoryRequiresSubmission && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-md mx-auto">
                                <p className="text-sm text-yellow-800">
                                    <strong>Class Session:</strong> Please submit your data to track your progress.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <hr />

                    {/* STATS SUMMARY */}
                    <div className="grid grid-cols-2 gap-4 text-lg">
                        <StatItem label="Questions Completed" value={stats.totalQuestionsCompleted} />
                        <StatItem label="Time Spent (min)" value={(fixedSessionData.totalTimeSeconds / 60).toFixed(1)} />
                        <StatItem label="First-Try Successes" value={stats.totalFirstTrialSuccess} />
                        <StatItem label="Questions Retried" value={stats.retriedChallengesCount} />
                        <StatItem label="Used 'Show Answer'" value={stats.totalDontKnows} />
                        <StatItem label="Avg. Trials (on retries)" value={stats.avgTrialsForRetries} />
                    </div>

                    <hr />

                    {/* CONDITIONAL DATA SUBMISSION OR COMPLETION MESSAGE */}
                    {renderCompletionMessage()}

                    {/* NAVIGATION */}
                    <div className="pt-4 flex justify-center">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/category-selection')}
                            className="flex items-center gap-2"
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

// Simple reusable component for stats display
const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between p-3 bg-white rounded-lg border shadow-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold text-indigo-700">{value}</span>
    </div>
);
