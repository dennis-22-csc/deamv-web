// components/layout/Layout.tsx
import React from 'react';
import { usePathname } from 'next/navigation';
import { Header, PracticeHeader, CategoryHeader, MainHeader } from './Header';

// Define the LayoutVariant type for reuse
type LayoutVariant = 'default' | 'centered' | 'practice' | 'fullscreen';

interface LayoutProps {
	children: React.ReactNode;
	variant?: LayoutVariant;
	className?: string;
	headerProps?: {
		title?: string;
		showBackButton?: boolean;
		onBackClick?: () => void;
		actions?: React.ReactNode;
	};
}

const Layout: React.FC<LayoutProps> = ({
	children,
	variant = 'default',
	className = '',
	headerProps,
}) => {
	const pathname = usePathname();

	// Auto-detect layout variant based on route
	const getAutoVariant = (): LayoutVariant => {
		if (pathname === '/') return 'centered';
		if (pathname === '/category-selection') return 'default';
		if (pathname?.startsWith('/practice')) return 'practice';
		return 'default';
	};

	// Ensure layoutVariant is a defined LayoutVariant
	const layoutVariant: LayoutVariant = variant === 'default' ? getAutoVariant() : variant;

	const getLayoutStyles = () => {
		switch (layoutVariant) {
			case 'centered':
				return 'min-h-screen bg-gradient-to-br from-blue-50 to-green-50';
			case 'practice':
				return 'min-h-screen bg-gray-50';
			case 'fullscreen':
				return 'min-h-screen bg-white';
			default:
				return 'min-h-screen bg-gray-50';
		}
	};

	const getContentStyles = () => {
		switch (layoutVariant) {
			case 'centered':
				return 'flex items-center justify-center p-4';
			case 'practice':
				return 'max-w-6xl mx-auto px-4 py-6';
			case 'fullscreen':
				return 'h-screen overflow-hidden';
			default:
				return 'max-w-4xl mx-auto px-4 py-8';
		}
	};

	// Auto-generate header based on route
	const renderAutoHeader = () => {
		switch (pathname) {
			case '/':
				return <MainHeader {...headerProps} />;

			case '/category-selection':
				return (
					<CategoryHeader
						onLoadQuestions={headerProps?.actions ? undefined : () => {}}
						onChangeApiKey={headerProps?.actions ? undefined : () => {}}
						{...headerProps}
					/>
				);

			default:
				if (pathname?.startsWith('/practice')) {
					// NOTE: window.location is only available client-side, using it here requires this component to be client-side.
					const category = new URLSearchParams(window.location.search).get('category') || 'Data Science';
					return (
						<PracticeHeader
							category={category}
							onLeavePractice={headerProps?.onBackClick}
							{...headerProps}
						/>
					);
				}

				return (
					<Header
						showBackButton={pathname !== '/'}
						{...headerProps}
					/>
				);
		}
	};

	return (
		<div className={`${getLayoutStyles()} ${className}`}>
			{/* Header */}
			{renderAutoHeader()}

			{/* Main Content */}
			<main className={getContentStyles()}>
				{children}
			</main>

			{/* Footer (optional) */}
			{layoutVariant === 'centered' && (
				<footer className="fixed bottom-4 left-0 right-0 text-center">
					<p className="text-sm text-gray-600">
						DeamV - Data Science Practice App
					</p>
				</footer>
			)}
		</div>
	);
};

// Specialized Layout Components

interface CenteredLayoutProps extends Omit<LayoutProps, 'variant'> {
	maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const CenteredLayout: React.FC<CenteredLayoutProps> = ({
	children,
	maxWidth = 'md',
	className = '',
	...props
}) => {
	const maxWidthStyles = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
	};

	return (
		<Layout variant="centered" className={className} {...props}>
			<div className={`w-full ${maxWidthStyles[maxWidth]} mx-auto`}>
				{children}
			</div>
		</Layout>
	);
};

interface PracticeLayoutProps extends Omit<LayoutProps, 'variant'> {
	category?: string;
	onLeavePractice?: () => void;
	onToggleTTS?: () => void;
	isTtsEnabled?: boolean;
}

const PracticeLayout: React.FC<PracticeLayoutProps> = ({
	children,
	category,
	onLeavePractice,
	onToggleTTS,
	isTtsEnabled,
	className = '',
	...props
}) => {
	return (
		<Layout
			variant="practice"
			className={className}
			headerProps={{
				title: category ? `Practice - ${category}` : 'Practice Session',
				onBackClick: onLeavePractice,
				actions: onToggleTTS ? (
					<button
						onClick={onToggleTTS}
						className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<span>TTS: {isTtsEnabled ? 'On' : 'Off'}</span>
					</button>
				) : undefined,
			}}
			{...props}
		>
			{children}
		</Layout>
	);
};

interface CategoryLayoutProps extends Omit<LayoutProps, 'variant'> {
	onLoadQuestions?: () => void;
	onChangeApiKey?: () => void;
}

const CategoryLayout: React.FC<CategoryLayoutProps> = ({
	children,
	onLoadQuestions,
	onChangeApiKey,
	className = '',
	...props
}) => {
	return (
		<Layout
			variant="default"
			className={className}
			headerProps={{
				title: "Practice Categories",
				showBackButton: true,
				onBackClick: () => window.history.back(),
				actions: (
					<>
						<button
							onClick={onLoadQuestions}
							className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<span>Load Questions</span>
						</button>
						<button
							onClick={onChangeApiKey}
							className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<span>API Key</span>
						</button>
					</>
				),
			}}
			{...props}
		>
			{children}
		</Layout>
	);
};

interface FullscreenLayoutProps extends Omit<LayoutProps, 'variant'> {
	hideHeader?: boolean;
}

const FullscreenLayout: React.FC<FullscreenLayoutProps> = ({
	children,
	hideHeader = false,
	className = '',
	...props
}) => {
	return (
		<Layout variant="fullscreen" className={className} {...props}>
			{hideHeader ? (
				children
			) : (
				<div className="h-full flex flex-col">
					{props.headerProps && (
						<div className="flex-shrink-0">
							<Header {...props.headerProps} />
						</div>
					)}
					<div className="flex-1 overflow-auto">
						{children}
					</div>
				</div>
			)}
		</Layout>
	);
};

// Layout Provider for global layout state
interface LayoutContextType {
	currentLayout: LayoutVariant;
	// FIX: Change the setter type to only accept values assignable to LayoutVariant.
	// This matches the type of the `setCurrentLayout` function from the hook.
	setLayout: React.Dispatch<React.SetStateAction<LayoutVariant>>;
}

const LayoutContext = React.createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
	children: React.ReactNode;
	defaultLayout?: LayoutVariant;
}

const LayoutProvider: React.FC<LayoutProviderProps> = ({
	children,
	defaultLayout = 'default',
}) => {
	// The state is explicitly typed as LayoutVariant, meaning the setter is Dispatch<SetStateAction<LayoutVariant>>
	const [currentLayout, setCurrentLayout] = React.useState<LayoutVariant>(defaultLayout);

	const value: LayoutContextType = {
		currentLayout,
		// This assignment is now valid because LayoutContextType.setLayout matches the type of setCurrentLayout.
		setLayout: setCurrentLayout,
	};

	return (
		<LayoutContext.Provider value={value}>
			{children}
		</LayoutContext.Provider>
	);
};

// Hook to use layout context
const useLayout = () => {
	const context = React.useContext(LayoutContext);
	if (context === undefined) {
		throw new Error('useLayout must be used within a LayoutProvider');
	}
	return context;
};

export {
	Layout,
	CenteredLayout,
	PracticeLayout,
	CategoryLayout,
	FullscreenLayout,
	LayoutProvider,
	useLayout,
};
export type { LayoutProps, CenteredLayoutProps, PracticeLayoutProps, LayoutVariant };
