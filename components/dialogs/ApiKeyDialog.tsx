import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ApiKeyDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (apiKey: string) => void;
	onGetKey: () => void;
	initialApiKey?: string;
	title?: string;
	description?: string;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({
	isOpen,
	onClose,
	onSave,
	onGetKey,
	initialApiKey = '',
	title = "Gemini API Key",
	description = "Enter your Google Gemini API key to enable AI-powered code evaluation and feedback.",
}) => {
	const [apiKey, setApiKey] = useState(initialApiKey);
	const [showApiKey, setShowApiKey] = useState(false);
	const [error, setError] = useState('');
	const [isTesting, setIsTesting] = useState(false);
	const [isValid, setIsValid] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setApiKey(initialApiKey);
			setError('');
			setShowApiKey(false);
			setIsValid(false);
		}
	}, [isOpen, initialApiKey]);

	const validateApiKey = (key: string): boolean => {
		if (!key.trim()) {
			setError('API key is required');
			return false;
		}

		// Basic validation for Gemini API key format
		// Gemini API keys typically start with "AIza" and are 39 characters long
		if (!key.match(/^AIza[0-9A-Za-z-_]{35}$/)) {
			setError("Doesn't look like a valid Gemini API key format");
			return false;
		}

		setError('');
		return true;
	};

	const handleApiKeyChange = (value: string) => {
		setApiKey(value);
		validateApiKey(value);
	};

	const handleSave = async () => {
		if (!validateApiKey(apiKey)) {
			return;
		}

		try {
			setIsTesting(true);
			
			// Basic client-side validation only
			// In a real app, you might want to make a test API call
			if (apiKey.match(/^AIza[0-9A-Za-z-_]{35}$/)) {
				setIsValid(true);
				setTimeout(() => {
					onSave(apiKey.trim());
					setIsTesting(false);
				}, 500);
			} else {
				setError('Please enter a valid Gemini API key');
				setIsTesting(false);
			}
		} catch (error) {
			setError('Failed to validate API key. Please check your connection and try again.');
			setIsTesting(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSave();
		}
	};

	return (
		<Dialog
			isOpen={isOpen}
			onClose={onClose}
			title={title}
			variant="alert"
			confirmText={isValid ? "Saved!" : "Save API Key"}
			cancelText="Cancel"
			onConfirm={isValid ? undefined : handleSave}
			// FIX: Remove onCancel, the base Dialog uses onClose for the cancel button
			loading={isTesting}
			showCloseButton={true}
		>
			<div className="space-y-6">
				{/* Description */}
				<div className="text-gray-600 text-sm leading-relaxed">
					{description}
				</div>

				{/* API Key Input */}
				<div className="space-y-3">
					<label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700">
						Gemini API Key
					</label>
					
					<div className="relative">
						<Input
							id="api-key-input"
							type={showApiKey ? "text" : "password"}
							value={apiKey}
							onChange={(e) => handleApiKeyChange(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Enter your AIza... API key"
							variant="outlined"
							fullWidth
							startIcon={<Key className="h-4 w-4 text-gray-400" />}
						/>
						{/* Visibility toggle button - positioned separately */}
						<button
							type="button"
							onClick={() => setShowApiKey(!showApiKey)}
							className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
						>
							{showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</button>
					</div>

					{error && (
						<p className="text-sm text-red-600 flex items-center gap-1">
							{/* Note: CheckCircle2 icon usage here seems incorrect for an error state, but preserved as per original code structure */}
							<CheckCircle2 className="h-4 w-4" />
							{error}
						</p>
					)}

					{!error && apiKey && (
						<p className="text-sm text-green-600 flex items-center gap-1">
							<CheckCircle2 className="h-4 w-4" />
							API key format looks good
						</p>
					)}
				</div>

				{/* Get API Key Section */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<div className="flex-shrink-0">
							<ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
						</div>
						<div className="flex-1">
							<h4 className="text-sm font-medium text-blue-900 mb-1">
								Don't have an API key?
							</h4>
							<p className="text-sm text-blue-700 mb-3">
								Get your free API key from Google AI Studio to enable AI-powered code evaluation.
							</p>
							<Button
								variant="outline"
								onClick={onGetKey}
								className="w-full flex items-center justify-center gap-2"
								size="sm"
							>
								<ExternalLink className="h-4 w-4" />
								Get API Key from Google AI Studio
							</Button>
						</div>
					</div>
				</div>

				{/* Security Notice */}
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
					<div className="flex items-start gap-2">
						<CheckCircle2 className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
						<div>
							<h5 className="text-xs font-medium text-gray-900 mb-1">
								Security & Privacy
							</h5>
							<p className="text-xs text-gray-600">
								Your API key is stored securely on your device and is only used to communicate 
								directly with Google's Gemini API. We never send your API key to our servers.
							</p>
						</div>
					</div>
				</div>

				{/* Quick Tips */}
				<div className="space-y-2">
					<h5 className="text-xs font-medium text-gray-900">Quick Tips:</h5>
					<ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
						<li>API keys start with "AIza" followed by 35 characters</li>
						<li>Keep your API key secure and don't share it publicly</li>
						<li>You can regenerate your API key anytime from Google AI Studio</li>
						<li>Free tier includes generous usage limits for learning</li>
					</ul>
				</div>

				{/* Success State */}
				{isValid && (
					<div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
						<CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
						<p className="text-sm font-medium text-green-800">
							API Key Saved Successfully!
						</p>
						<p className="text-xs text-green-700 mt-1">
							You're ready to start practicing with AI-powered feedback.
						</p>
					</div>
				)}
			</div>
		</Dialog>
	);
};

// Simplified version for quick API key entry
interface QuickApiKeyDialogProps extends Omit<ApiKeyDialogProps, 'title' | 'description'> {
	onContinueWithoutKey?: () => void;
}

const QuickApiKeyDialog: React.FC<QuickApiKeyDialogProps> = ({
	onContinueWithoutKey,
	...props
}) => {
	const [localApiKey, setLocalApiKey] = useState(props.initialApiKey || '');

	const handleSave = () => {
		if (localApiKey.trim()) {
			props.onSave(localApiKey.trim());
		}
	};
    
    // Create a custom handler for the dialog close event, which will fire when 
    // the 'Cancel' button (labeled 'Continue without key') is clicked.
    const handleCloseOrContinue = () => {
        if (onContinueWithoutKey) {
            onContinueWithoutKey();
        } else {
            props.onClose();
        }
    }

	return (
		<Dialog
			isOpen={props.isOpen}
			onClose={handleCloseOrContinue} // FIX: Pass the custom handler to onClose
			title="API Key Required"
			variant="alert"
			confirmText="Save API Key"
			cancelText="Continue without key"
			onConfirm={handleSave}
			// FIX: Remove onCancel
			showCloseButton={true}
		>
			<div className="space-y-6">
				<div className="text-gray-600 text-sm leading-relaxed">
					You need a Gemini API key to start practicing. Get one for free from Google AI Studio, or enter your existing key below.
				</div>

				<div className="space-y-3">
					<label htmlFor="quick-api-key-input" className="block text-sm font-medium text-gray-700">
						Gemini API Key
					</label>
					
					<div className="relative">
						<Input
							id="quick-api-key-input"
							type="password"
							value={localApiKey}
							onChange={(e) => setLocalApiKey(e.target.value)}
							placeholder="Enter your AIza... API key"
							variant="outlined"
							fullWidth
							startIcon={<Key className="h-4 w-4 text-gray-400" />}
						/>
					</div>
				</div>

				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<ExternalLink className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
						<div className="flex-1">
							<p className="text-sm text-blue-700 mb-3">
								Get your free API key from Google AI Studio to enable AI-powered code evaluation.
							</p>
							<Button
								variant="outline"
								onClick={props.onGetKey}
								className="w-full flex items-center justify-center gap-2"
								size="sm"
							>
								<ExternalLink className="h-4 w-4" />
								Get API Key from Google AI Studio
							</Button>
						</div>
					</div>
				</div>
			</div>
		</Dialog>
	);
};

// API Key Management Dialog
interface ApiKeyManagementDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (apiKey: string) => void;
	onGetKey: () => void;
	onRemoveKey: () => void;
	currentApiKey?: string;
}

const ApiKeyManagementDialog: React.FC<ApiKeyManagementDialogProps> = ({
	isOpen,
	onClose,
	onSave,
	onGetKey,
	onRemoveKey,
	currentApiKey,
}) => {
	const [showCurrentKey, setShowCurrentKey] = useState(false);
	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const maskedKey = currentApiKey 
		? `${currentApiKey.substring(0, 8)}${'•'.repeat(20)}${currentApiKey.substring(28)}`
		: 'Not set';

	const handleSaveNewKey = (apiKey: string) => {
		onSave(apiKey);
		setShowUpdateDialog(false);
	};

	return (
		<>
			<Dialog
				isOpen={isOpen && !showUpdateDialog}
				onClose={onClose}
				title="Manage API Key"
				variant="default"
				showCancel={true}
				cancelText="Close"
				// FIX: Remove onCancel
				showCloseButton={true}
			>
				<div className="space-y-6">
					{/* Current Key Status */}
					<div className="bg-gray-50 rounded-lg p-4">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="text-sm font-medium text-gray-900">Current Status</h4>
								<p className="text-sm text-gray-600 mt-1">
									{currentApiKey ? (
										<span className="flex items-center gap-2">
											<CheckCircle2 className="h-4 w-4 text-green-600" />
											API key is configured
										</span>
									) : (
										<span className="text-orange-600">No API key configured</span>
									)}
								</p>
							</div>
							{currentApiKey && (
								<Button
									variant="outline"
									size="sm"
									onClick={onRemoveKey}
								>
									Remove
								</Button>
							)}
						</div>

						{currentApiKey && (
							<div className="mt-3 p-3 bg-white rounded border">
								<div className="flex items-center justify-between">
									<code className="text-sm font-mono">
										{showCurrentKey ? currentApiKey : maskedKey}
									</code>
									<button
										onClick={() => setShowCurrentKey(!showCurrentKey)}
										className="text-gray-400 hover:text-gray-600"
									>
										{showCurrentKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Update Key Button */}
					<Button
						variant="primary"
						onClick={() => setShowUpdateDialog(true)}
						className="w-full"
					>
						{currentApiKey ? 'Update API Key' : 'Add API Key'}
					</Button>

					{/* Get New Key */}
					{!currentApiKey && (
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<div className="flex items-start gap-3">
								<ExternalLink className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
								<div className="flex-1">
									<h4 className="text-sm font-medium text-blue-900 mb-1">
										Need an API key?
									</h4>
									<p className="text-sm text-blue-700 mb-3">
										Get your free API key from Google AI Studio.
									</p>
									<Button
										variant="outline"
										onClick={onGetKey}
										className="w-full flex items-center justify-center gap-2"
										size="sm"
									>
										<ExternalLink className="h-4 w-4" />
										Get API Key from Google AI Studio
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>
			</Dialog>

			{/* Update API Key Dialog */}
			<ApiKeyDialog
				isOpen={showUpdateDialog}
				onClose={() => setShowUpdateDialog(false)}
				onSave={handleSaveNewKey}
				onGetKey={onGetKey}
				initialApiKey={currentApiKey}
				title={currentApiKey ? "Update API Key" : "Add API Key"}
				description={currentApiKey 
					? "Enter a new Gemini API key to replace the current one."
					: "Enter your Gemini API key to enable AI-powered code evaluation and feedback."
				}
			/>
		</>
	);
};

export { ApiKeyDialog, QuickApiKeyDialog, ApiKeyManagementDialog };
