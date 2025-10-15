'use client';

import { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Volume2, VolumeX, CheckCircle, XCircle } from 'lucide-react';
import { Suspense } from 'react'; // 👈 Import Suspense

// UI Components
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { ChallengeView } from '@/components/practice/ChallengeView';
import { ProgressIndicator } from '@/components/practice/ProgressIndicator';
import { FeedbackDisplay } from '@/components/practice/FeedbackDisplay';
import { PracticeControls } from '@/components/practice/ControlButtons';
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog';
import { PracticeComplete } from '@/components/practice/PracticeComplete';

// Libs/Database
import { getApiKey } from '@/lib/storage';
import { practiceDatabase } from '@/lib/database';
import { DataScienceChallenge, ChallengeAttempt, PracticeDataPayload } from '@/lib/database';

// Define the API endpoint for evaluation
const EVALUATION_API_ENDPOINT = '/api/evaluate-answer';

interface EvaluationRequest {
	instruction: string;
	userCode: string;
	expectedSolution: string;
	language?: string;
	context?: string;
	apiKey?: string;
}

interface EvaluationResponse {
	success: boolean;
	feedback: string;
	isCorrect: boolean;
	score?: number;
	suggestions?: string[];
	errors?: string[];
	confidence?: number;
}

interface TrialAttempt {
	code: string;
	feedback: string;
	timestamp: Date;
}

interface CurrentChallengeAttemptState {
	challengeId: string;
	startTime: number;
	trials: number;
	showAnswerClicked: boolean;
	incorrectAttempts: TrialAttempt[];
}

interface PracticeState {
	challenges: DataScienceChallenge[];
	currentChallengeIndex: number;
	userCode: string;
	feedback: string;
	isCorrect: boolean | null;
	isShowingSampleAnswer: boolean;
	isEvaluating: boolean;
	isTtsEnabled: boolean;
	showLeaveConfirmation: boolean;
	isLoading: boolean;

	// NEW SESSION TRACKING FIELDS
	sessionStartTime: number; // For tracking total time
	sessionEndTime: number | null; // Null means session is ongoing
	allChallengeAttempts: ChallengeAttempt[]; // Completed attempts log
}

// ----------------------------------------------------------------------
// 1. New Component to hold the actual page logic and useSearchParams
// ----------------------------------------------------------------------
function PracticePageContent() {
	// The useSearchParams hook is now correctly inside a component that will be wrapped
	const searchParams = useSearchParams();
	const category = searchParams.get('category') || 'General';
	const router = useRouter();

	const [state, setState] = useState<PracticeState>({
		challenges: [],
		currentChallengeIndex: 0,
		userCode: '',
		feedback: '',
		isCorrect: null,
		isShowingSampleAnswer: false,
		isEvaluating: false,
		isTtsEnabled: true,
		showLeaveConfirmation: false,
		isLoading: true,

		sessionStartTime: Date.now(),
		sessionEndTime: null,
		allChallengeAttempts: [],
	});

	const [currentAttempt, setCurrentAttempt] = useState<CurrentChallengeAttemptState>({
		challengeId: '',
		startTime: Date.now(),
		trials: 0,
		showAnswerClicked: false,
		incorrectAttempts: [],
	});

	const [tts, setTts] = useState<SpeechSynthesisUtterance | null>(null);
	const [isTtsReady, setIsTtsReady] = useState(false);

	// Initialize TTS
	useEffect(() => {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			const utterance = new SpeechSynthesisUtterance();
			setTts(utterance);
			setIsTtsReady(true);
		}
	}, []);

	const speakText = (text: string) => {
		if (tts && isTtsReady && state.isTtsEnabled) {
			window.speechSynthesis.cancel();
			tts.text = text;
			window.speechSynthesis.speak(tts);
		}
	};

	const speakChallengeInstruction = (challenge: DataScienceChallenge, index: number, total: number) => {
		const textToSpeak = `Challenge ${index + 1} of ${total}. Your task is: ${challenge.instruction}`;
		speakText(textToSpeak);
	};

	const loadChallenges = useCallback(async () => {
		try {
			// This depends on the category which is dynamic
			const challenges = await practiceDatabase.getDataScienceChallengesByCategory(category, 10);

			if (challenges.length === 0) {
				setState(prev => ({
					...prev,
					challenges: [],
					feedback: `No questions found for category: ${category}\n\nPlease load a questions file or select a different category.`,
					isCorrect: null,
					isLoading: false,
				}));
				speakText("No questions available for this category. Please load a questions file.");
				return;
			}

			const shuffledChallenges = [...challenges].sort(() => Math.random() - 0.5);

			setState(prev => ({
				...prev,
				challenges: shuffledChallenges,
				currentChallengeIndex: 0,
				isCorrect: null,
				isLoading: false,
			}));

			if (shuffledChallenges.length > 0) {
				// Initialize the first challenge's attempt state
				setCurrentAttempt({
					challengeId: shuffledChallenges[0].id,
					startTime: Date.now(),
					trials: 0,
					showAnswerClicked: false,
					incorrectAttempts: [],
				});
				if (isTtsReady) {
					speakChallengeInstruction(shuffledChallenges[0], 0, shuffledChallenges.length);
				}
			}
		} catch (error) {
			console.error('Error loading challenges:', error);
			setState(prev => ({
				...prev,
				feedback: 'Error loading challenges. Please try again.',
				isCorrect: null,
				isLoading: false,
			}));
		}
	}, [category, isTtsReady]);

	// Load challenges on mount
	useEffect(() => {
		// Only load if challenges array is empty and not already loading
		if (state.challenges.length === 0 && state.isLoading) {
			loadChallenges();
		}
	}, [loadChallenges, state.challenges.length, state.isLoading]);

	// Safe access to current challenge
	const currentChallenge = state.challenges[state.currentChallengeIndex];
	const totalChallenges = state.challenges.length;

	const handleCodeChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		const code = e.target.value;
		setState(prev => ({ ...prev, userCode: code }));
	};

	const isDontKnowResponse = (userInput: string): boolean => {
		if (!userInput.trim()) return false;

		const lowerInput = userInput.toLowerCase().trim();
		return lowerInput.includes("i don't know") ||
			lowerInput.includes("i dont know") ||
			lowerInput.includes("idk") ||
			lowerInput.includes("no idea") ||
			lowerInput.includes("show answer");
	};

	const logTrial = (isCorrect: boolean, userCode: string, feedback: string) => {
		setCurrentAttempt(prev => {
			const newIncorrectAttempts = !isCorrect ? [...prev.incorrectAttempts, {
				code: userCode,
				feedback: feedback,
				timestamp: new Date(),
			}] : prev.incorrectAttempts;

			return {
				...prev,
				trials: prev.trials + 1,
				incorrectAttempts: newIncorrectAttempts,
			};
		});
	};

	const handleEvaluationResult = (result: EvaluationResponse) => {
		const cleanedFeedback = cleanFeedbackText(result.feedback);

		// 1. Log the attempt details
		logTrial(result.isCorrect, state.userCode, cleanedFeedback);

		// 2. Update the main UI state
		setState(prev => ({
			...prev,
			feedback: cleanedFeedback,
			isEvaluating: false,
			isCorrect: result.isCorrect,
		}));

		// 3. Provide TTS feedback
		if (result.isCorrect) {
			speakText("Correct! Please click next to continue to the next challenge.");
		} else {
			const additionalText = "\n\nYou can enter 'show answer' or 'I don't know' in the box to see a sample answer.";
			speakText("Not quite right. Please go through the provided feedback and try again.");
			setState(prev => ({
				...prev,
				feedback: cleanedFeedback + additionalText
			}));
		}
	};

	const handleSubmit = async () => {
		if (!state.userCode.trim() && !state.isShowingSampleAnswer) {
			setState(prev => ({
				...prev,
				feedback: 'Please write some code first.',
				isCorrect: false,
			}));
			return;
		}

		if (!currentChallenge) {
			setState(prev => ({
				...prev,
				feedback: 'No challenge available. Please try loading questions again.',
				isCorrect: false,
			}));
			return;
		}

		if (isDontKnowResponse(state.userCode)) {
			handleDontKnowResponse();
			return;
		}

		setState(prev => ({ ...prev, isEvaluating: true, isCorrect: null }));

		try {
			// Get the API key from storage
			const apiKey = await getApiKey();
			
			if (!apiKey) {
				throw new Error('API key not found. Please configure your Gemini API key in settings.');
			}

			// Prepare the payload 
			const payload: EvaluationRequest = {
				instruction: currentChallenge.instruction,
				userCode: state.userCode,
				expectedSolution: currentChallenge.solution,
				apiKey: apiKey, 
			};

			// Use fetch to call the Route Handler
			const response = await fetch(EVALUATION_API_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			// Handle the response
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
				const errorMessage = errorData.message || `Server error (Status ${response.status})`;
				throw new Error(errorMessage);
			}

			const result: EvaluationResponse = await response.json();
			handleEvaluationResult(result);
		} catch (error) {
			console.error('Error evaluating code:', error);
			setState(prev => ({
				...prev,
				feedback: `Evaluation failed. ${error instanceof Error ? error.message : 'Please check your internet connection and try again.'}`,
				isEvaluating: false,
				isCorrect: false,
			}));
			// We still log this attempt as a trial
			logTrial(false, state.userCode, 'Evaluation failed via API call.');
		}
	};

	const handleDontKnowResponse = () => {
		if (!currentChallenge) {
			setState(prev => ({
				...prev,
				feedback: 'No challenge available to show answer.',
				isCorrect: false,
			}));
			return;
		}

		// Update attempt state to reflect "show answer" click
		setCurrentAttempt(prev => ({
			...prev,
			showAnswerClicked: true,
		}));

		setState(prev => ({
			...prev,
			isShowingSampleAnswer: true,
			feedback: `You requested the answer. Please study the sample solution below, then click 'Hide Answer' to clear your input and try again.`,
			isCorrect: false, // Mark as incorrect since they didn't solve it
			userCode: '', // Clear user code to force them to re-implement
		}));

		speakText("Here's a sample answer. Please study it and try to implement it in your own words. Click Hide Answer to retake the challenge.");
	};

	const cleanFeedbackText = (text: string): string => {
		if (!text) return text;

		return text
			.replace(/\*/g, '')
			.replace(/`/g, "'")
			.replace(/\*\*/g, '')
			.replace(/__/g, '');
	};

	/**
	 * Finalizes the metrics for the current challenge and saves it to the session log.
	 */
	const finalizeCurrentAttempt = () => {
		if (!currentChallenge || currentAttempt.trials === 0) return;

		const timeSpentSeconds = Math.round((Date.now() - currentAttempt.startTime) / 1000);

		// FIX: Add the required 'timestamp' property. (This was already in the original code but kept for completeness)
		const finalAttempt: ChallengeAttempt = {
			challengeId: currentChallenge.id,
			isCorrect: state.isCorrect === true, // The final result for this challenge
			trials: currentAttempt.trials,
			// Check if it was correct on the very first submission AND they hadn't clicked 'show answer'
			gotOnFirstTrial: currentAttempt.trials === 1 && state.isCorrect === true && !currentAttempt.showAnswerClicked,
			showAnswerClicked: currentAttempt.showAnswerClicked,
			timeSpentSeconds,
			incorrectAttempts: currentAttempt.incorrectAttempts,
			timestamp: new Date(), // <-- The missing required property
		};

		setState(prev => ({
			...prev,
			allChallengeAttempts: [...prev.allChallengeAttempts, finalAttempt],
		}));
	};

	const handleNextChallenge = () => {
		// 1. Finalize and log the current attempt
		finalizeCurrentAttempt();

		const nextIndex = state.currentChallengeIndex + 1;

		if (nextIndex >= state.challenges.length) {
			// END SESSION: Set end time and let the render block handle the completion screen
			setState(prev => ({
				...prev,
				sessionEndTime: Date.now(),
			}));
			return;
		}

		// 2. Reset state for the next challenge
		setState(prev => ({
			...prev,
			currentChallengeIndex: nextIndex,
			userCode: '',
			feedback: '',
			isCorrect: null,
			isShowingSampleAnswer: false,
		}));

		// 3. Reset the current attempt state for the NEW challenge
		setCurrentAttempt({
			challengeId: state.challenges[nextIndex].id,
			startTime: Date.now(),
			trials: 0,
			showAnswerClicked: false,
			incorrectAttempts: [],
		});

		if (isTtsReady) {
			speakChallengeInstruction(state.challenges[nextIndex], nextIndex, totalChallenges);
		}
	};

	const handleHideAnswer = () => {
		// Resetting the state to allow resubmission
		setState(prev => ({
			...prev,
			feedback: '',
			isShowingSampleAnswer: false,
			userCode: '',
			isCorrect: false, // Setting to false ensures the primary button says 'Resubmit'
		}));
	};

	const handleToggleTts = () => {
		setState(prev => ({
			...prev,
			isTtsEnabled: !prev.isTtsEnabled
		}));

		if (state.isTtsEnabled) {
			window.speechSynthesis.cancel();
		}
	};

	const handleLeavePractice = () => {
		// Optional: Finalize the current attempt before showing the dialog
		finalizeCurrentAttempt();

		if (state.currentChallengeIndex > 0 || state.allChallengeAttempts.length > 0) {
			setState(prev => ({ ...prev, showLeaveConfirmation: true }));
		} else {
			router.push('/category-selection');
		}
	};

	const handleConfirmLeave = () => {
		setState(prev => ({ ...prev, showLeaveConfirmation: false }));
		router.push('/category-selection');
	};

	const handleCancelLeave = () => {
		setState(prev => ({ ...prev, showLeaveConfirmation: false }));
	};

	if (state.sessionEndTime !== null) {
		// 1. Create the final PracticeDataPayload
		const totalTimeSeconds = Math.round((state.sessionEndTime - state.sessionStartTime) / 1000);

		const finalSessionData: PracticeDataPayload = {
			sessionId: state.sessionStartTime.toString(),
			registrationCode: null, // To be filled in PracticeComplete
			category: category,
			startTime: new Date(state.sessionStartTime),
			endTime: new Date(state.sessionEndTime),
			totalChallenges: state.challenges.length,
			totalTimeSeconds: totalTimeSeconds,

			totalQuestionsCompleted: state.allChallengeAttempts.filter(a => a.trials > 0).length,
			totalDontKnows: state.allChallengeAttempts.filter(a => a.showAnswerClicked).length,
			totalFirstTrialSuccess: state.allChallengeAttempts.filter(a => a.gotOnFirstTrial).length,

			attempts: state.allChallengeAttempts,
		};

		return <PracticeComplete sessionData={finalSessionData} />;
	}

	if (state.isLoading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="max-w-6xl mx-auto px-4 py-6">
					<Card className="p-8 text-center">Loading Challenges for <b>{category}</b>...</Card>
				</div>
			</div>
		);
	}

	if (state.challenges.length === 0) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="max-w-6xl mx-auto px-4 py-6">
					<Card className="p-8 text-center">
						<div className="space-y-4">
							<XCircle className="h-10 w-10 text-red-500 mx-auto" />
							<h2 className="text-xl font-semibold">No Challenges Available</h2>
							<p className="text-gray-600">
								We couldn't find any challenges for the <b>{category}</b> category.
							</p>
							<Button onClick={() => router.push('/category-selection')}>
								Select a different Category
							</Button>
						</div>
					</Card>
				</div>
			</div>
		);
	}

	if (!currentChallenge) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="max-w-6xl mx-auto px-4 py-6">
					<Card className="p-8 text-center">Loading Challenge...</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-6xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								onClick={handleLeavePractice}
								className="flex items-center gap-2"
							>
								<ArrowLeft className="h-4 w-4" />
								Leave Practice
							</Button>
							<h1 className="text-xl font-semibold text-gray-900">
								Practice - {category}
							</h1>
						</div>

						<Button
							variant="outline"
							onClick={handleToggleTts}
							className="flex items-center gap-2"
						>
							{state.isTtsEnabled ? (
								<Volume2 className="h-4 w-4" />
							) : (
								<VolumeX className="h-4 w-4" />
							)}
							{state.isTtsEnabled ? 'Mute' : 'Unmute'}
						</Button>
					</div>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-4 py-6">
				<div className="space-y-6">
					{/* Progress Indicator */}
					<ProgressIndicator
						current={state.currentChallengeIndex + 1}
						total={totalChallenges}
					/>

					{/* Challenge Instruction */}
					<ChallengeView
						challenge={currentChallenge}
						currentCategory={category}
						challengeNumber={state.currentChallengeIndex + 1}
						totalChallenges={totalChallenges}
					/>

					{/* Code Input */}
					<Card>
						<div className="p-6 space-y-4">
							<label className="block text-sm font-medium text-gray-700">
								Write your Python code here:
							</label>
							<Textarea
								value={state.userCode}
								onChange={handleCodeChange}
								placeholder="Write your Python code here..."
								rows={8}
								disabled={state.isShowingSampleAnswer || state.isEvaluating}
								className="font-mono text-sm"
							/>
						</div>
					</Card>

					{/* Control Buttons */}
					<PracticeControls
						onSubmit={handleSubmit}
						onNext={handleNextChallenge}
						onShowAnswer={handleDontKnowResponse}
						onHideAnswer={handleHideAnswer}
						isEvaluating={state.isEvaluating}
						isCorrect={state.isCorrect}
						mode={
							state.isEvaluating ? 'evaluating' :
								state.isShowingSampleAnswer ? 'showing-answer' :
									state.isCorrect === true ? 'correct' :
										state.isCorrect === false ? 'incorrect' :
											'initial'
						}
					/>

					{/* Feedback */}
					{state.feedback && (
						<FeedbackDisplay
							feedback={state.feedback}
							sampleAnswer={currentChallenge.solution}
							showSampleAnswer={state.isShowingSampleAnswer}
							onHideAnswer={handleHideAnswer}
						/>
					)}
				</div>
			</main>

			{/* Leave Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={state.showLeaveConfirmation}
				onClose={handleCancelLeave}
				onConfirm={handleConfirmLeave}
				title="Leave Practice?"
				message="Your current session progress will be finalized and logged. Are you sure you want to leave?"
				confirmText="Leave"
				cancelText="Stay"
			/>
		</div>
	);
}

// ----------------------------------------------------------------------
// 2. Default Export with Suspense Boundary
// ----------------------------------------------------------------------
export default function PracticePage() {
    return (
        // Wrapping the component that uses useSearchParams() in a Suspense boundary
        // fixes the prerendering error during the build process.
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <Card className="p-8 text-center">Loading application...</Card>
                </div>
            </div>
        }>
            <PracticePageContent />
        </Suspense>
    );
}
