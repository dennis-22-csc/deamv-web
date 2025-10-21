'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Volume2, VolumeX, CheckCircle, XCircle, Play } from 'lucide-react';
import { Suspense } from 'react'; 

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
import { DataScienceChallenge, ChallengeAttempt, PracticeDataPayload, PracticeSession } from '@/lib/database';

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
	sessionId?: string; // Store session ID for resuming
}

// ----------------------------------------------------------------------
// 1. New Component to hold the actual page logic and useSearchParams
// ----------------------------------------------------------------------
function PracticePageContent() {
	// The useSearchParams hook is now correctly inside a component that will be wrapped
	const searchParams = useSearchParams();
	const category = searchParams.get('category') || 'General';
	const resumeSession = searchParams.get('resume') === 'true';
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

	// NEW: Check for existing session on component mount
	const checkExistingSession = useCallback(async () => {
		try {
			if (resumeSession) {
				console.log(`🔄 [PracticePage] Checking for existing session in category: ${category}`);
				const existingSession = await practiceDatabase.getActivePracticeSession(category);
				
				if (existingSession) {
					console.log(`✅ [PracticePage] Found existing session:`, {
						id: existingSession.id,
						currentIndex: existingSession.currentIndex,
						completed: existingSession.completed.length,
						totalChallenges: existingSession.challenges.length
					});
					
					// Load the session data
					await loadSessionData(existingSession);
					return true;
				} else {
					console.log(`ℹ️ [PracticePage] No existing session found for category: ${category}`);
				}
			}
			return false;
		} catch (error) {
			console.error('❌ [PracticePage] Error checking for existing session:', error);
			return false;
		}
	}, [category, resumeSession]);

	// NEW: Load session data from existing session
	const loadSessionData = useCallback(async (session: PracticeSession) => {
		try {
			console.log(`📥 [PracticePage] Loading session data for session: ${session.id}`);
			
			// Get the challenge details for the session
			const sessionChallenges: DataScienceChallenge[] = [];
			for (const challengeId of session.challenges) {
				const challenge = await practiceDatabase.getChallengeById(challengeId);
				if (challenge) {
					sessionChallenges.push(challenge);
				}
			}

			if (sessionChallenges.length === 0) {
				console.warn(`⚠️ [PracticePage] No challenges found for session ${session.id}`);
				return false;
			}

			// Reconstruct attempts from completed challenges
			const reconstructedAttempts: ChallengeAttempt[] = [];
			
			// For each completed challenge, create a basic attempt record
			for (const completedId of session.completed) {
				const challenge = sessionChallenges.find(c => c.id === completedId);
				if (challenge) {
					reconstructedAttempts.push({
						challengeId: completedId,
						isCorrect: true, // Assume completed challenges were correct
						trials: 1, // Default value
						gotOnFirstTrial: true, // Default value
						showAnswerClicked: false, // Default value
						timeSpentSeconds: 60, // Default value
						timestamp: new Date(session.startTime), // Use session start time
						incorrectAttempts: [],
					});
				}
			}

			// Update state with session data
			setState(prev => ({
				...prev,
				challenges: sessionChallenges,
				currentChallengeIndex: session.currentIndex,
				sessionStartTime: session.startTime.getTime(),
				sessionId: session.id,
				allChallengeAttempts: reconstructedAttempts,
				isLoading: false,
			}));

			// Set up current attempt for the current challenge
			const currentChallenge = sessionChallenges[session.currentIndex];
			if (currentChallenge) {
				setCurrentAttempt({
					challengeId: currentChallenge.id,
					startTime: Date.now(), // Reset start time for current challenge
					trials: 0,
					showAnswerClicked: false,
					incorrectAttempts: [],
				});

				if (isTtsReady) {
					speakChallengeInstruction(currentChallenge, session.currentIndex, sessionChallenges.length);
				}
			}

			console.log(`✅ [PracticePage] Session loaded successfully. Current challenge: ${session.currentIndex + 1}/${sessionChallenges.length}`);
			return true;
		} catch (error) {
			console.error('❌ [PracticePage] Error loading session data:', error);
			return false;
		}
	}, [isTtsReady]);

	// NEW: Save session progress
	const saveSessionProgress = useCallback(async () => {
		try {
			if (!state.sessionId && state.challenges.length > 0) {
				// Create new session
				const challengeIds = state.challenges.map(c => c.id);
				const sessionId = await practiceDatabase.createPracticeSession(category, challengeIds);
				setState(prev => ({ ...prev, sessionId }));
				console.log(`💾 [PracticePage] Created new session: ${sessionId}`);
			}

			if (state.sessionId) {
				// Update existing session
				const completedIds = state.allChallengeAttempts.map(attempt => attempt.challengeId);
				const sessionData: PracticeSession = {
					id: state.sessionId,
					category,
					challenges: state.challenges.map(c => c.id),
					completed: completedIds,
					currentIndex: state.currentChallengeIndex,
					score: state.allChallengeAttempts.filter(a => a.isCorrect).length,
					startTime: new Date(state.sessionStartTime),
					isCompleted: false,
				};

				await practiceDatabase.saveActivePracticeSession(category, sessionData);
				console.log(`💾 [PracticePage] Session progress saved: ${state.currentChallengeIndex + 1}/${state.challenges.length}`);
			}
		} catch (error) {
			console.error('❌ [PracticePage] Error saving session progress:', error);
		}
	}, [state.sessionId, state.challenges, state.allChallengeAttempts, state.currentChallengeIndex, state.sessionStartTime, category]);

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

	// Load challenges on mount - UPDATED to check for existing sessions first
	useEffect(() => {
		const initializePractice = async () => {
			// First, check for existing session
			const hasExistingSession = await checkExistingSession();
			
			// If no existing session found, load new challenges
			if (!hasExistingSession && state.challenges.length === 0 && state.isLoading) {
				await loadChallenges();
			}
		};

		initializePractice();
	}, [checkExistingSession, loadChallenges, state.challenges.length, state.isLoading]);

	// Save session progress when state changes
	useEffect(() => {
		if (state.challenges.length > 0 && !state.isLoading) {
			saveSessionProgress();
		}
	}, [state.currentChallengeIndex, state.allChallengeAttempts, saveSessionProgress, state.challenges.length, state.isLoading]);

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

            // Correctly handle non-OK responses, including 401 (Invalid API Key) and others
			if (!response.ok) {
				// Attempt to read the error message from the JSON body
				const errorData = await response.json().catch(() => ({ message: `Unknown server error (Status ${response.status})` }));
				
                // The Route Handler is now designed to return a JSON object with a specific message
                // which includes the actual Gemini API error message (e.g., for 401).
				const errorMessage = errorData.message || `Server error (Status ${response.status})`;
                
                // Throw the extracted error message
				throw new Error(errorMessage);
			}
            
            // If response is OK
			const result: EvaluationResponse = await response.json();
			handleEvaluationResult(result);

		} catch (error) {
			console.error('Error evaluating code:', error);
            
            // Determine the feedback message
            let feedbackMessage = 'Evaluation failed. Please check your internet connection and try again.';
            if (error instanceof Error) {
                feedbackMessage = `Evaluation failed: ${error.message}`;
                
                // Refine messages for common errors returned by the Route Handler
                // The route handler now sends the exact message for validation and API errors.
                if (error.message.includes('API key not found')) {
                    feedbackMessage = 'Evaluation failed: Gemini API key not configured. Please check your settings.';
                } else if (error.message.includes('Invalid API key provided.') || error.message.includes('API key not valid')) {
					// Catch both the Route's simplified message and the detailed Gemini message
					feedbackMessage = `**API KEY ERROR:** The provided Gemini API Key is invalid or not authorized. Please leave the practice session and update your key in the homepage. \n\nDetails: ${error.message}`;
				} else if (error.message.includes('Rate limit exceeded')) {
					feedbackMessage = `**RATE LIMIT EXCEEDED:** You have sent too many requests. Please try again later. \n\nDetails: ${error.message}`;
				} else if (error.message.includes('Service unavailable') || error.message.includes('503')) {
					feedbackMessage = `**SERVICE ERROR:** The Gemini AI service is temporarily unavailable. Please try again in a few moments.`;
				}
            }

			setState(prev => ({
				...prev,
				feedback: feedbackMessage,
				isEvaluating: false,
				isCorrect: false,
			}));
			// We still log this attempt as a trial
			logTrial(false, state.userCode, feedbackMessage);
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

	// NEW: Show session resume banner
	// FIX: Explicitly cast to boolean using !! to avoid the expression returning a string ('') or a string ('session-id')
	const showResumeBanner = !!(resumeSession && state.sessionId && state.currentChallengeIndex > 0);

	if (state.sessionEndTime !== null) {
		// 1. Create the final PracticeDataPayload
		const totalTimeSeconds = Math.round((state.sessionEndTime - state.sessionStartTime) / 1000);

		const finalSessionData: PracticeDataPayload = {
			sessionId: state.sessionId || state.sessionStartTime.toString(),
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

		return <PracticeComplete sessionData={finalSessionData} category={category} />;
	}

	if (state.isLoading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="max-w-6xl mx-auto px-4 py-6">
					<Card className="p-8 text-center">
						{resumeSession ? 'Checking for existing session...' : `Loading Challenges for <b>${category}</b>...`}
					</Card>
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
							<div>
								<h1 className="text-xl font-semibold text-gray-900">
									Practice - {category}
								</h1>
								{showResumeBanner && (
									<p className="text-sm text-green-600 flex items-center gap-1">
										<Play className="h-3 w-3" />
										Resuming your session ({state.currentChallengeIndex + 1}/{totalChallenges})
									</p>
								)}
							</div>
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
				{/* Session Resume Banner */}
				{showResumeBanner && (
					<div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
						<div className="flex items-center gap-3">
							<Play className="h-5 w-5 text-green-600" />
							<div>
								<h3 className="font-medium text-green-800">Session Resumed</h3>
								<p className="text-sm text-green-700">
									Continuing from where you left off. You've completed {state.currentChallengeIndex} of {totalChallenges} challenges.
								</p>
							</div>
						</div>
					</div>
				)}

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
						hasExistingSession={showResumeBanner}
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
				message="Your current session progress will be saved and you can resume later. Are you sure you want to leave?"
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
