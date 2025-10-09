import React from 'react';
import { 
	Play, 
	ArrowRight, 
	Eye, 
	EyeOff, 
	RotateCcw,
	SkipForward,
	CheckCircle2,
	XCircle,
	HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ControlButtonsProps {
	// Button handlers
	onSubmit?: () => void;
	onNext?: () => void;
	onHideAnswer?: () => void;
	onTryAgain?: () => void;
	onSkip?: () => void;
	onShowAnswer?: () => void;
	
	// Visibility states
	showSubmit?: boolean;
	showNext?: boolean;
	showHideAnswer?: boolean;
	showTryAgain?: boolean;
	showSkip?: boolean;
	showShowAnswer?: boolean;
	
	// Button states
	isEvaluating?: boolean;
	isSubmitting?: boolean;
	isCorrect?: boolean | null; // Changed to allow null for initial state
	isShowingAnswer?: boolean;
	canSubmit?: boolean;
	
	// Text customization
	submitText?: string;
	nextText?: string;
	hideAnswerText?: string;
	tryAgainText?: string;
	skipText?: string;
	showAnswerText?: string;
	
	// Layout
	layout?: 'horizontal' | 'vertical' | 'auto';
	className?: string;
	fullWidth?: boolean;
}

const ControlButtons: React.FC<ControlButtonsProps> = ({
	// Button handlers
	onSubmit,
	onNext,
	onHideAnswer,
	onTryAgain,
	onSkip,
	onShowAnswer,
	
	// Visibility states
	showSubmit = true,
	showNext = false,
	showHideAnswer = false,
	showTryAgain = false,
	showSkip = false,
	showShowAnswer = false,
	
	// Button states
	isEvaluating = false,
	isSubmitting = false,
	isCorrect = null, // Set default to null
	isShowingAnswer = false,
	canSubmit = true,
	
	// Text customization
	submitText = 'Submit Code',
	nextText = 'Next Challenge',
	hideAnswerText = 'Hide Answer',
	tryAgainText = 'Try Again',
	skipText = 'Skip Challenge',
	showAnswerText = 'Show Answer',
	
	// Layout
	layout = 'horizontal',
	className = '',
	fullWidth = false,
}) => {
	const isVertical = layout === 'vertical' || (layout === 'auto' && (showHideAnswer || showTryAgain || showShowAnswer));

	// Determine the effective submit button text and icon
	let actualSubmitText = submitText;
	let submitIcon = Play;
	
	if (isCorrect === true) {
		actualSubmitText = 'Correct!';
		submitIcon = CheckCircle2;
	} else if (isCorrect === false && submitText === 'Submit Code') {
		// When incorrect, change the default 'Submit Code' text to 'Resubmit' or 'Try Again'
		actualSubmitText = 'Resubmit';	
		submitIcon = RotateCcw;
	}


	// Determine which buttons to show based on state
	const getVisibleButtons = () => {
		const buttons = [];

		// Submit Button - Primary action
		if (showSubmit && onSubmit) {
			buttons.push({
				key: 'submit',
				variant: isCorrect === true ? 'success' as const : 'primary' as const,
				onClick: onSubmit,
				disabled: !canSubmit || isSubmitting || isEvaluating || isCorrect === true,
				loading: isSubmitting || isEvaluating, // Use isSubmitting/isEvaluating for loading
				icon: submitIcon,
				text: actualSubmitText,
				order: 1,
			});
		}

		// Next Button - Move to next challenge (Primary action when correct)
		if (showNext && onNext) {
			buttons.push({
				key: 'next',
				variant: 'success' as const, // Primary color for flow control
				onClick: onNext,
				disabled: isSubmitting || isEvaluating,
				icon: ArrowRight,
				text: nextText,
				order: 6,
			});
		}
		
		// Show Answer Button - When stuck (Secondary action)
		if (showShowAnswer && onShowAnswer) {
			buttons.push({
				key: 'show-answer',
				variant: 'outline' as const,
				onClick: onShowAnswer,
				disabled: isSubmitting || isEvaluating,
				icon: HelpCircle,
				text: showAnswerText,
				order: 3,
			});
		}

		// Hide Answer Button - When answer is shown (Secondary action)
		if (showHideAnswer && onHideAnswer) {
			buttons.push({
				key: 'hide-answer',
				variant: 'outline' as const,
				onClick: onHideAnswer,
				disabled: isSubmitting || isEvaluating,
				icon: EyeOff,
				text: hideAnswerText,
				order: 4,
			});
		}

		// Skip Button - Skip current challenge (Tertiary action)
		if (showSkip && onSkip) {
			buttons.push({
				key: 'skip',
				variant: 'ghost' as const,
				onClick: onSkip,
				disabled: isSubmitting || isEvaluating,
				icon: SkipForward,
				text: skipText,
				order: 5,
			});
		}

		return buttons.sort((a, b) => a.order - b.order);
	};

	const visibleButtons = getVisibleButtons();

	if (visibleButtons.length === 0) {
		return null;
	}

	const containerClasses = `
		${isVertical ? 'space-y-3' : 'flex flex-wrap gap-3 justify-between'}
		${fullWidth ? 'w-full' : ''}
		${className}
	`;

	const buttonClasses = fullWidth && isVertical ? 'w-full' : '';
	
	// Custom rendering for horizontal/auto layout to keep primary actions on the right
	if (!isVertical) {
		const primaryActions = visibleButtons.filter(b => b.key === 'submit' || b.key === 'next');
		const secondaryActions = visibleButtons.filter(b => b.key !== 'submit' && b.key !== 'next');
		
		return (
			<Card className="p-4">
				<div className={`flex justify-between items-center ${fullWidth ? 'w-full' : ''} ${className}`}>
					{/* Secondary/Tertiary Actions (Left) */}
					<div className="flex gap-3">
						{secondaryActions.map((button) => (
							<Button
								key={button.key}
								variant={button.variant}
								onClick={button.onClick}
								disabled={button.disabled}
								loading={button.loading}
								className="flex items-center gap-2"
								size="lg"
							>
								<button.icon className="h-4 w-4" />
								{button.text}
							</Button>
						))}
					</div>
					
					{/* Primary Actions (Right) - Only submit OR next should be here */}
					<div className="flex gap-3">
						{primaryActions.map((button) => (
							<Button
								key={button.key}
								variant={button.variant}
								onClick={button.onClick}
								disabled={button.disabled}
								loading={button.loading}
								className={`flex items-center gap-2 ${buttonClasses}`}
								size="lg"
							>
								<button.icon className="h-4 w-4" />
								{button.text}
							</Button>
						))}
					</div>
				</div>
			</Card>
		);
	}


	return (
		<Card className="p-4">
			<div className={containerClasses}>
				{visibleButtons.map((button) => (
					<Button
						key={button.key}
						variant={button.variant}
						onClick={button.onClick}
						disabled={button.disabled}
						loading={button.loading}
						className={`flex items-center gap-2 ${buttonClasses}`}
						size="lg"
					>
						<button.icon className="h-4 w-4" />
						{button.text}
					</Button>
				))}
			</div>
		</Card>
	);
};

// Pre-configured button sets for common scenarios

interface PracticeControlsProps extends Omit<ControlButtonsProps, 
	'showSubmit' | 'showNext' | 'showHideAnswer' | 'showTryAgain' | 'showSkip' | 'showShowAnswer' | 'isCorrect'
> {
	mode: 'initial' | 'evaluating' | 'correct' | 'incorrect' | 'showing-answer';
	isCorrect: boolean | null; // Pass correctness state explicitly
}

const PracticeControls: React.FC<PracticeControlsProps> = ({
	mode,
	onShowAnswer,
	isCorrect, // Use the prop
	...props
}) => {
	const getButtonConfig = () => {
		switch (mode) {
			case 'initial':
				// FIX: Only show Submit button initially
				return {
					showSubmit: true,
					showShowAnswer: false, 
					showSkip: false,      
					showNext: false,
					showHideAnswer: false,
				};
			
			case 'evaluating':
				return {
					showSubmit: true, 
					showShowAnswer: false,
					showSkip: false,
					showNext: false,
					showHideAnswer: false,
					isEvaluating: true,
					submitText: 'Evaluating...',
				};
			
			case 'correct':
				return {
					showSubmit: true, 
					showShowAnswer: false,
					showSkip: false,
					showNext: true, 
					showHideAnswer: false,
					isCorrect: true,
				};
			
			case 'incorrect':
				// FIX: Show all retry/help options when the user is incorrect
				return {
					showSubmit: true, // Primary action is Resubmit/Try Again
					showShowAnswer: true, // Allow user to show answer
					showSkip: true, // Allow user to skip
					showNext: false,
					showHideAnswer: false,
					isCorrect: false, 
				};
			
			case 'showing-answer':
				// FIX: Hide all submission and navigation buttons, only show Hide Answer.
				return {
					showSubmit: false,
					showShowAnswer: false,
					showSkip: false,
					showNext: false,
					showHideAnswer: true, // Only show Hide Answer
				};
			
			default:
				// Default should match initial state
				return {
					showSubmit: true,
					showShowAnswer: false,
					showSkip: false,
					showNext: false,
					showHideAnswer: false,
				};
		}
	};

	const config = getButtonConfig();

	return (
		<ControlButtons
			{...config}
			isCorrect={isCorrect} // Pass the correctness state
			onShowAnswer={onShowAnswer}
			{...props}
		/>
	);
};

// Compact controls for tight spaces
interface CompactControlsProps extends Omit<ControlButtonsProps, 'layout' | 'fullWidth'> {
	primaryActionOnly?: boolean;
}

const CompactControls: React.FC<CompactControlsProps> = ({
	primaryActionOnly = false,
	...props
}) => {
	if (primaryActionOnly) {
		// Show only the most important button
		const { showNext, showSubmit, showHideAnswer, isCorrect } = props;
		
		// Logic to determine primary action
		const nextIsPrimary = showNext && props.onNext;
		const hideIsPrimary = showHideAnswer && props.onHideAnswer;
		const submitIsPrimary = showSubmit && props.onSubmit && !isCorrect;

		if (nextIsPrimary) {
			return (
				<Button
					variant="primary"
					onClick={props.onNext}
					disabled={props.isSubmitting || props.isEvaluating}
					className="flex items-center gap-2 w-full"
					size="lg"
				>
					<ArrowRight className="h-4 w-4" />
					{props.nextText}
				</Button>
			);
		}
		
		if (submitIsPrimary) {
			// Reuse the logic from ControlButtons for dynamic submit text
			let actualSubmitText = props.submitText || 'Submit Code';
			if (isCorrect === true) {
				actualSubmitText = 'Correct!';
			} else if (actualSubmitText === 'Submit Code') {
				actualSubmitText = 'Resubmit';	
			}

			return (
				<Button
					variant={props.isCorrect === true ? 'success' : 'primary'}
					onClick={props.onSubmit}
					disabled={!props.canSubmit || props.isSubmitting || props.isEvaluating}
					loading={props.isSubmitting || props.isEvaluating}
					className="flex items-center gap-2 w-full"
					size="lg"
				>
					<Play className="h-4 w-4" />
					{actualSubmitText}
				</Button>
			);
		}
		
		if (hideIsPrimary) {
			return (
				<Button
					variant="outline"
					onClick={props.onHideAnswer}
					disabled={props.isSubmitting || props.isEvaluating}
					className="flex items-center gap-2 w-full"
					size="lg"
				>
					<EyeOff className="h-4 w-4" />
					{props.hideAnswerText}
				</Button>
			);
		}
	}

	return (
		<ControlButtons
			layout="vertical"
			fullWidth
			{...props}
		/>
	);
};

// Floating controls for bottom of screen
interface FloatingControlsProps extends ControlButtonsProps {
	position?: 'bottom-left' | 'bottom-center' | 'bottom-right';
}

const FloatingControls: React.FC<FloatingControlsProps> = ({
	position = 'bottom-center',
	className = '',
	...props
}) => {
	const positionClasses = {
		'bottom-left': 'left-4 bottom-4',
		'bottom-center': 'left-1/2 bottom-4 -translate-x-1/2',
		'bottom-right': 'right-4 bottom-4',
	};

	return (
		<div className={`fixed ${positionClasses[position]} z-40 max-w-sm ${className}`}>
			<ControlButtons
				fullWidth
				layout="vertical"
				{...props}
			/>
		</div>
	);
};

// Quick Actions Bar
interface QuickActionsProps {
	onShowAnswer: () => void;
	onSkip: () => void;
	onSubmit?: () => void;
	canSubmit?: boolean;
	isSubmitting?: boolean;
	className?: string;
	isCorrect?: boolean | null; // Added isCorrect for Resubmit logic
}

const QuickActions: React.FC<QuickActionsProps> = ({
	onShowAnswer,
	onSkip,
	onSubmit,
	canSubmit = true,
	isSubmitting = false,
	className = '',
	isCorrect = null,
}) => {
	let submitText = 'Submit';
	if (isCorrect === true) {
		submitText = 'Correct!';
	} else if (isCorrect === false) {
		submitText = 'Resubmit';
	}
	
	return (
		<div className={`flex gap-2 ${className}`}>
			<Button
				variant="outline"
				size="sm"
				onClick={onShowAnswer}
				disabled={isSubmitting}
				className="flex items-center gap-1"
			>
				<HelpCircle className="h-3 w-3" />
				Show Answer
			</Button>
			
			<Button
				variant="outline"
				size="sm"
				onClick={onSkip}
				disabled={isSubmitting}
				className="flex items-center gap-1"
			>
				<SkipForward className="h-3 w-3" />
				Skip
			</Button>
			
			{onSubmit && (
				<Button
					variant={isCorrect === true ? 'success' : 'primary'}
					size="sm"
					onClick={onSubmit}
					disabled={!canSubmit || isSubmitting || isCorrect === true}
					loading={isSubmitting}
					className="flex items-center gap-1 ml-auto"
				>
					{(isCorrect === true) ? <CheckCircle2 className="h-3 w-3" /> : <Play className="h-3 w-3" />}
					{submitText}
				</Button>
			)}
		</div>
	);
};

export {
	ControlButtons,
	PracticeControls,
	CompactControls,
	FloatingControls,
	QuickActions,
};
