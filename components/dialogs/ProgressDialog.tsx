// components/dialogs/ProgressDialog.tsx
import React from 'react';
import { 
	Loader2, 
	Clock, 
	Database, 
	Upload, 
	Download,
	CheckCircle2,
	AlertCircle
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

// Define the DialogProps from your component library to fix the onCancel issue.
// If you control the Dialog component, you should add onCancel to its props.
// Since we don't have access to DialogProps, we'll assume it doesn't take onCancel,
// and the cancel logic is either implicit or handled by the Dialog internally.

interface ProgressDialogProps {
	isOpen: boolean;
	onClose?: () => void;
	title?: string;
	message?: string;
	progress?: number; // 0-100
	type?: 'default' | 'upload' | 'download' | 'processing' | 'indeterminate';
	showProgressBar?: boolean;
	showPercentage?: boolean;
	estimatedTime?: number; // in seconds
	currentStep?: string;
	totalSteps?: number;
	showCancelButton?: boolean;
	onCancel?: () => void;
	className?: string;
	// FIX 1: Add children prop to accept content from specialized dialogs
	children?: React.ReactNode; 
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({
	isOpen,
	onClose,
	title = "Processing...",
	message = "Please wait while we process your request",
	progress = 0,
	type = 'default',
	showProgressBar = true,
	showPercentage = true,
	estimatedTime,
	currentStep,
	totalSteps,
	showCancelButton = false,
	onCancel,
	className = '',
	children, // Destructure children prop
}) => {
	const getIcon = () => {
		switch (type) {
			case 'upload':
				return <Upload className="h-6 w-6 text-blue-600" />;
			case 'download':
				return <Download className="h-6 w-6 text-green-600" />;
			case 'processing':
				return <Database className="h-6 w-6 text-purple-600" />;
			default:
				return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
		}
	};

	const getProgressColor = () => {
		if (progress < 30) return 'bg-red-500';
		if (progress < 70) return 'bg-yellow-500';
		return 'bg-green-500';
	};

	const formatTime = (seconds: number): string => {
		if (seconds < 60) return `${seconds} seconds`;
		const minutes = Math.ceil(seconds / 60);
		return `${minutes} minute${minutes > 1 ? 's' : ''}`;
	};

	const getEstimatedTimeRemaining = () => {
		if (!estimatedTime || progress >= 100) return null;

		const remainingProgress = 100 - progress;
		const timePerPercent = estimatedTime / 100;
		const remainingTime = Math.ceil((remainingProgress * timePerPercent) / 10) * 10; // Round to nearest 10 seconds

		return remainingTime;
	};

	const remainingTime = getEstimatedTimeRemaining();

	return (
		<Dialog
			isOpen={isOpen}
			onClose={onClose || (() => {})}
			title={title}
			variant="default"
			showCancel={showCancelButton}
			cancelText="Cancel"
			showCloseButton={false}
			closeOnOverlayClick={false}
			className={className}
		>
			<div className="space-y-6">
				{/* Main Content */}
				<div className="flex items-start gap-4">
					{/* Animated Icon */}
					<div className="flex-shrink-0">
						{type === 'indeterminate' ? (
							<div className="relative">
								<Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
								<div className="absolute inset-0 animate-ping">
									<Loader2 className="h-8 w-8 text-blue-400 opacity-75" />
								</div>
							</div>
						) : (
							getIcon()
						)}
					</div>

					{/* Content */}
					<div className="flex-1 space-y-3 min-w-0">
						{/* Message */}
						<p className="text-gray-700 text-sm leading-relaxed">
							{message}
						</p>

						{/* Current Step */}
						{currentStep && (
							<div className="flex items-center gap-2 text-xs text-gray-600">
								<CheckCircle2 className="h-3 w-3 text-green-500" />
								<span className="font-medium">{currentStep}</span>
								{totalSteps && (
									<span className="text-gray-500">
										(Step {Math.floor((progress / 100) * totalSteps) + 1} of {totalSteps})
									</span>
								)}
							</div>
						)}

						{/* Progress Bar */}
						{showProgressBar && type !== 'indeterminate' && (
							<div className="space-y-2">
								<div className="flex justify-between items-center text-sm">
									<span className="text-gray-700">Progress</span>
									{showPercentage && (
										<span className="font-medium text-gray-900">
											{Math.round(progress)}%
										</span>
									)}
								</div>

								<div className="w-full bg-gray-200 rounded-full h-2">
									<div 
										className={`h-2 rounded-full transition-all duration-300 ease-out ${getProgressColor()}`}
										style={{ width: `${progress}%` }}
									/>
								</div>
							</div>
						)}

						{/* Time Estimate */}
						{remainingTime && (
							<div className="flex items-center gap-2 text-xs text-gray-500">
								<Clock className="h-3 w-3" />
								<span>Estimated time remaining: {formatTime(remainingTime)}</span>
							</div>
						)}
					</div>
				</div>

				{/* Additional Info */}
				{type === 'indeterminate' && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
						<div className="flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
							<p className="text-sm text-blue-700">
								This may take a few moments. Please don't close this window.
							</p>
						</div>
					</div>
				)}
				
				{/* FIX 3: Render children passed to ProgressDialog */}
				{children}
			</div>
		</Dialog>
	);
};

// Specialized Progress Dialogs

interface FileUploadProgressDialogProps extends Omit<ProgressDialogProps, 'type' | 'title' | 'children'> {
	fileName?: string;
	fileSize?: string;
	uploadSpeed?: string;
}

const FileUploadProgressDialog: React.FC<FileUploadProgressDialogProps> = ({
	fileName,
	fileSize,
	uploadSpeed,
	...props
}) => {
	return (
		<ProgressDialog
			type="upload"
			title="Uploading File"
			message={fileName ? `Uploading ${fileName}` : "Uploading your file..."}
			{...props}
		>
			{(fileName || fileSize || uploadSpeed) && (
				<div className="grid grid-cols-3 gap-4 text-xs text-gray-600 mt-2">
					{fileName && (
						<div>
							<div className="font-medium">File</div>
							<div className="truncate">{fileName}</div>
						</div>
					)}
					{fileSize && (
						<div>
							<div className="font-medium">Size</div>
							<div>{fileSize}</div>
						</div>
					)}
					{uploadSpeed && (
						<div>
							<div className="font-medium">Speed</div>
							<div>{uploadSpeed}</div>
						</div>
					)}
				</div>
			)}
		</ProgressDialog>
	);
};

interface QuestionProcessingDialogProps extends Omit<ProgressDialogProps, 'type' | 'title' | 'children'> {
	processedItems?: number;
	totalItems?: number;
	currentOperation?: 'parsing' | 'validating' | 'importing' | 'indexing';
}

const QuestionProcessingDialog: React.FC<QuestionProcessingDialogProps> = ({
	processedItems,
	totalItems,
	currentOperation = 'processing',
	...props
}) => {
	const getOperationMessage = () => {
		switch (currentOperation) {
			case 'parsing':
				return "Reading and parsing file content...";
			case 'validating':
				return "Validating question format and structure...";
			case 'importing':
				return "Importing questions into database...";
			case 'indexing':
				return "Building search indexes...";
			default:
				return "Processing questions...";
		}
	};

	const progress = totalItems && processedItems 
		? Math.round((processedItems / totalItems) * 100)
		: props.progress || 0;

	return (
		<ProgressDialog
			type="processing"
			title="Processing Questions"
			message={getOperationMessage()}
			progress={progress}
			showProgressBar={!!totalItems}
			showPercentage={!!totalItems}
			{...props}
		>
			{processedItems !== undefined && totalItems !== undefined && (
				<div className="flex items-center justify-between text-xs text-gray-600 mt-2">
					<span>Processed {processedItems} of {totalItems} questions</span>
					<span>{Math.round((processedItems / totalItems) * 100)}%</span>
				</div>
			)}
		</ProgressDialog>
	);
};

interface AIEvaluationDialogProps extends Omit<ProgressDialogProps, 'type' | 'title' | 'children'> {
	evaluationStep?: 'analyzing' | 'comparing' | 'generating';
}

const AIEvaluationDialog: React.FC<AIEvaluationDialogProps> = ({
	evaluationStep = 'analyzing',
	...props
}) => {
	const getStepMessage = () => {
		switch (evaluationStep) {
			case 'analyzing':
				return "Analyzing your code structure and logic...";
			case 'comparing':
				return "Comparing with expected solution...";
			case 'generating':
				return "Generating detailed feedback...";
			default:
				return "Evaluating your solution...";
		}
	};

	const getStepProgress = () => {
		switch (evaluationStep) {
			case 'analyzing':
				return 25;
			case 'comparing':
				return 60;
			case 'generating':
				return 90;
			default:
				return 0;
		}
	};

	return (
		<ProgressDialog
			type="indeterminate"
			title="AI Evaluation"
			message={getStepMessage()}
			progress={getStepProgress()}
			showProgressBar={true}
			showPercentage={true}
			estimatedTime={15}
			{...props}
		/>
	);
};

interface DatabaseOperationDialogProps extends Omit<ProgressDialogProps, 'type' | 'title' | 'children'> {
	operation?: 'loading' | 'saving' | 'syncing' | 'backup';
}

const DatabaseOperationDialog: React.FC<DatabaseOperationDialogProps> = ({
	operation = 'loading',
	...props
}) => {
	const getOperationConfig = () => {
		switch (operation) {
			case 'loading':
				return {
					title: "Loading Data",
					message: "Loading your practice data from storage...",
					type: 'download' as const,
				};
			case 'saving':
				return {
					title: "Saving Progress",
					message: "Saving your practice session progress...",
					type: 'upload' as const,
				};
			case 'syncing':
				return {
					title: "Syncing Data",
					message: "Synchronizing with cloud storage...",
					type: 'processing' as const,
				};
			case 'backup':
				return {
					title: "Creating Backup",
					message: "Creating backup of your practice data...",
					type: 'processing' as const,
				};
			default:
				return {
					title: "Database Operation",
					message: "Processing database operation...",
					type: 'default' as const,
				};
		}
	};

	const config = getOperationConfig();

	return (
		<ProgressDialog
			{...config}
			type="indeterminate"
			showProgressBar={false}
			showPercentage={false}
			{...props}
		/>
	);
};

// Simple Loading Spinner (minimal)
interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	message?: string;
	className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	size = 'md',
	message,
	className = '',
}) => {
	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-8 w-8',
		lg: 'h-12 w-12',
	};

	return (
		<div className={`flex flex-col items-center justify-center p-4 ${className}`}>
			<Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
			{message && (
				<p className="text-sm text-gray-600 mt-2 text-center">{message}</p>
			)}
		</div>
	);
};

// Inline Progress Indicator
interface InlineProgressProps {
	progress?: number;
	message?: string;
	showPercentage?: boolean;
	className?: string;
}

const InlineProgress: React.FC<InlineProgressProps> = ({
	progress = 0,
	message,
	showPercentage = true,
	className = '',
}) => {
	return (
		<div className={`flex items-center gap-3 ${className}`}>
			<Loader2 className="h-4 w-4 text-blue-600 animate-spin" />

			<div className="flex-1 space-y-1">
				{message && (
					<p className="text-sm text-gray-700">{message}</p>
				)}

				<div className="flex items-center gap-2">
					<div className="flex-1 bg-gray-200 rounded-full h-1">
						<div 
							className="bg-blue-600 h-1 rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>

					{showPercentage && (
						<span className="text-xs font-medium text-gray-700 min-w-8">
							{Math.round(progress)}%
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

export {
	ProgressDialog,
	FileUploadProgressDialog,
	QuestionProcessingDialog,
	AIEvaluationDialog,
	DatabaseOperationDialog,
	LoadingSpinner,
	InlineProgress,
};
