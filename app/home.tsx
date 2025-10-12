// app/page.tsx - Updated with Graded Quiz button
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Key, Play, Award, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ApiKeyDialog } from '@/components/dialogs/ApiKeyDialog';
import storageService from '@/lib/storage';

const GRADED_QUIZ_ENABLED = process.env.NEXT_PUBLIC_GRADED_QUIZ_ENABLED === 'true';


export default function Home() {
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	// Load API key when component mounts
	useEffect(() => {
		const checkApiKey = async () => {
			try {
				const storedApiKey = await storageService.getItem('gemini_api_key');
				
				// FIX: Cast storedApiKey to the expected type (string | null)
				setApiKey(storedApiKey as string | null);
			} catch (error) {
				console.error('Error loading API key:', error);
			} finally {
				setIsLoading(false);
			}
		};

		checkApiKey();
	}, []);

	// Handle "Begin Practice"
	const handleBeginPractice = () => {
		if (apiKey) {
			router.push('/category-selection');
		} else {
			setShowApiKeyDialog(true);
		}
	};

	// Handle "Take Graded Quiz"
	const handleGradedQuiz = () => {
		if (!GRADED_QUIZ_ENABLED) return;
		
		if (apiKey) {
			// We'll implement the quiz loading logic in the next part
			router.push('/graded-quiz');
		} else {
			setShowApiKeyDialog(true);
		}
	};

	// Save API key
	const handleApiKeySave = async (newApiKey: string) => {
		try {
			await storageService.setItem('gemini_api_key', newApiKey.trim());
			setApiKey(newApiKey.trim());
			setShowApiKeyDialog(false);
			router.push('/category-selection');
		} catch (error) {
			console.error('Error saving API key:', error);
		}
	};

	// Open Gemini API key link
	const handleGetApiKey = () => {
		window.open('https://aistudio.google.com/app/apikey', '_blank');
	};

	// Loading screen
	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
			<div className="max-w-md w-full space-y-8">
				{/* Header */}
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to DeamV</h1>
					<p className="text-gray-600">Practice your data science skills with AI-powered feedback</p>
				</div>

				{/* Main Card */}
				<Card className="p-8 space-y-6">
					<div className="text-center space-y-4">
						<p className="text-gray-700">
							Ready to begin your practice session!
							
						</p>

						{/* Practice Button */}
						<Button
							onClick={handleBeginPractice}
							className="w-full flex items-center justify-center gap-2"
							size="lg"
						>
							
							Begin Class Practice
						</Button>

						{/* Graded Quiz Button */}
						{GRADED_QUIZ_ENABLED && (
							<div className="space-y-2">
								<Button
									onClick={handleGradedQuiz}
									disabled={!GRADED_QUIZ_ENABLED}
									className={`w-full flex items-center justify-center gap-2 ${
										GRADED_QUIZ_ENABLED 
											? 'bg-purple-600 hover:bg-purple-700' 
											: 'bg-gray-400 cursor-not-allowed'
									}`}
									size="lg"
								>
									{GRADED_QUIZ_ENABLED ? (
										<>
											
											Take Graded Quiz
										</>
									) : (
										<>
											<Lock className="h-5 w-5" />
											Quiz Unavailable
										</>
									)}
								</Button>
								
								{!GRADED_QUIZ_ENABLED && (
									<p className="text-xs text-gray-500">
										Graded quizzes are currently disabled
									</p>
								)}
							</div>
						)}

						
					</div>

					{/* API Key Status */}
					<div className="bg-gray-50 rounded-lg p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Key className="h-4 w-4 text-gray-500" />
								<span className="text-sm font-medium text-gray-700">API Key Status</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className={`h-2 w-2 rounded-full ${
										apiKey ? 'bg-green-500' : 'bg-red-500'
									}`}
								/>
								<span className="text-sm text-gray-600">
									{apiKey ? 'Configured' : 'Not Set'}
								</span>
							</div>
						</div>

						{apiKey && (
							<div className="mt-2 flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowApiKeyDialog(true)}
									className="flex-1"
								>
									Change Key
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={handleGetApiKey}
									className="flex-1"
								>
									Get Key
								</Button>
							</div>
						)}
					</div>

					{/* Quiz Status Indicator */}
					{GRADED_QUIZ_ENABLED && (
						<div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Award className="h-4 w-4 text-purple-600" />
									<span className="text-sm font-medium text-purple-700">Graded Quiz</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="h-2 w-2 rounded-full bg-green-500" />
									<span className="text-sm text-purple-600">Available</span>
								</div>
							</div>
						</div>
					)}
				</Card>

				{/* Features List */}
				<div className="grid grid-cols-2 gap-4 text-center">
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-blue-600 font-bold text-lg">AI</div>
						<div className="text-xs text-gray-600">Powered Feedback</div>
					</div>
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-green-600 font-bold text-lg">100+</div>
						<div className="text-xs text-gray-600">Challenges</div>
					</div>
					{GRADED_QUIZ_ENABLED && (
						<>
							<div className="bg-white rounded-lg p-4 shadow-sm">
								<div className="text-purple-600 font-bold text-lg">Quiz</div>
								<div className="text-xs text-gray-600">Graded Tests</div>
							</div>
							<div className="bg-white rounded-lg p-4 shadow-sm">
								<div className="text-orange-600 font-bold text-lg">Timed</div>
								<div className="text-xs text-gray-600">Assessments</div>
							</div>
						</>
					)}
				</div>

				{/* API Key Dialog */}
				<ApiKeyDialog
					isOpen={showApiKeyDialog}
					onClose={() => setShowApiKeyDialog(false)}
					onSave={handleApiKeySave}
					onGetKey={handleGetApiKey}
					initialApiKey={apiKey || ''}
				/>
			</div>
		</div>
	);
}
