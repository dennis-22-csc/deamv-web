import React, { useState, useRef } from 'react';
import { 
	Upload, 
	FileText, 
	X, 
	CheckCircle2, 
	AlertCircle, 
	Database,
	Download,
	HelpCircle
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface FileLoadDialogProps {
	isOpen: boolean;
	onClose: () => void;
	// Updated onConfirm signature to optionally accept a File, allowing the dialog
	// to pass a drag-and-dropped file back to the parent.
	onConfirm: (file?: File) => void; 
	title?: string;
	message?: string;
	acceptedFileTypes?: string[];
	maxFileSize?: number; // in MB
	className?: string;
}

const FileLoadDialog: React.FC<FileLoadDialogProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title = "Load Questions File",
	message = "Select a questions file to load practice challenges",
	acceptedFileTypes = ['.txt', '.csv', 'text/plain'],
	maxFileSize = 10, // 10MB
	className = '',
}) => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState('');
	const fileInputRef = useRef<HTMLInputElement>(null);

	const resetState = () => {
		setSelectedFile(null);
		setError('');
		setIsDragging(false);
		if (fileInputRef.current) {
			  fileInputRef.current.value = '';
		}
	};

	const handleClose = () => {
		resetState();
		onClose();
	};

	const validateFile = (file: File): boolean => {
		// Check file type
		const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
		const isValidType = acceptedFileTypes.some(type => 
			type.startsWith('.') ? fileExtension === type : file.type === type
		);

		if (!isValidType) {
			setError(`Please select a valid file type: ${acceptedFileTypes.join(', ')}`);
			return false;
		}

		// Check file size
		const fileSizeMB = file.size / (1024 * 1024);
		if (fileSizeMB > maxFileSize) {
			setError(`File size must be less than ${maxFileSize}MB`);
			return false;
		}

		setError('');
		return true;
	};

	const handleFileSelect = (file: File) => {
		if (validateFile(file)) {
			setSelectedFile(file);
		} else {
			setSelectedFile(null);
		}
	};

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(false);
		
		const file = event.dataTransfer.files[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
		setError('');
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleConfirm = () => {
		// CRITICAL FIX: Pass the file if one was drag-and-dropped. 
		// Otherwise, pass undefined, signaling the parent to open the OS file picker.
		onConfirm(selectedFile || undefined);
		
		// We only reset the state if a file was confirmed via drag-and-drop
		// or if no file was selected (to clear previous errors/state).
		resetState();
	};

	const handleBrowseClick = () => {
		// Only here to trigger the hidden input, but the file picker is typically
		// managed by the parent via the main confirm button now.
		fileInputRef.current?.click();
	};

	const getFileIcon = (fileName: string) => {
		const extension = fileName.split('.').pop()?.toLowerCase();
		switch (extension) {
			case 'csv':
				return <Database className="h-8 w-8 text-green-600" />;
			case 'txt':
				return <FileText className="h-8 w-8 text-blue-600" />;
			default:
				return <FileText className="h-8 w-8 text-gray-600" />;
		}
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	return (
		<Dialog
			isOpen={isOpen}
			onClose={handleClose}
			title={title}
			variant="default"
			// FIX: Dynamically set the confirm text. The user should "Select" or "Confirm"
			// the file selection, which then leads to the final "Process/Save" button on the main page.
			confirmText={selectedFile ? "Confirm File Selection" : "Open File Browser"}
			cancelText="Cancel"
			onConfirm={handleConfirm}
			// FIX: Change onCancel to onClose
			// Error Line 171: onCancel={handleClose}
			showCloseButton={true}
			className={className}
		>
			<div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"> {/* ADDED max-h-[70vh] and overflow-y-auto */}
				{/* Message */}
				{message && (
					<p className="text-gray-600 text-sm leading-relaxed">
						{message}
					</p>
				)}

				{/* File Upload Area */}
				<div
					className={`
						border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
						${isDragging 
							? 'border-blue-400 bg-blue-50' 
							: selectedFile 
								? 'border-green-400 bg-green-50' 
								: 'border-gray-300 bg-gray-50 hover:border-gray-400'
						}
						cursor-pointer
					`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={handleBrowseClick}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept={acceptedFileTypes.join(',')}
						onChange={handleInputChange}
						className="hidden"
					/>

					{!selectedFile ? (
						<div className="space-y-4">
							<div className="flex justify-center">
								<div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
									<Upload className="h-8 w-8 text-blue-600" />
								</div>
							</div>
							
							<div>
								<p className="text-lg font-medium text-gray-900 mb-2">
									Drop your questions file here
								</p>
								<p className="text-sm text-gray-600 mb-4">
									or click to browse files
								</p>
							</div>

							<div className="text-xs text-gray-500 space-y-1">
								<p>Supported formats: {acceptedFileTypes.join(', ')}</p>
								<p>Maximum file size: {maxFileSize}MB</p>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex justify-center">
								{getFileIcon(selectedFile.name)}
							</div>
							
							<div className="space-y-2">
								<div className="flex items-center justify-center gap-2">
									<CheckCircle2 className="h-5 w-5 text-green-600" />
									<p className="font-medium text-gray-900">File Selected</p>
								</div>
								
								<div className="bg-white rounded-lg p-3 border">
									<div className="flex items-center justify-between">
										<div className="text-left">
											<p className="font-medium text-sm text-gray-900 truncate max-w-xs">
												{selectedFile.name}
											</p>
											<p className="text-xs text-gray-500">
												{formatFileSize(selectedFile.size)}
											</p>
										</div>
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleRemoveFile();
											}}
											className="text-gray-400 hover:text-gray-600 transition-colors"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Error Message */}
				{error && (
					<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
						<AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
						<p className="text-sm text-red-600">{error}</p>
					</div>
				)}

				{/* File Requirements */}
				<Card className="bg-blue-50 border-blue-200">
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<HelpCircle className="h-4 w-4 text-blue-600" />
							<h4 className="text-sm font-medium text-blue-900">
								File Format Requirements
							</h4>
						</div>
						
						<div className="text-sm text-blue-800 space-y-2">
							<p>Your questions file should be a CSV or text file with the following format:</p>
							
							<div className="bg-white rounded border border-blue-200 p-3 font-mono text-xs">
								<div className="text-blue-600"># CSV Format (recommended)</div>
								<div>Instruction,Solution,Category</div>
								<div>"Create a function that...","def solution():...","Python Basics"</div>
								<div className="mt-2 text-blue-600"># Or simple text format</div>
								<div>Instruction: Create a function that...</div>
								<div>Solution: def solution():...</div>
								<div>Category: Python Basics</div>
							</div>

							<div className="flex items-center gap-2 text-xs">
								<Download className="h-3 w-3" />
								<a 
									href="#" 
									onClick={(e) => {
										e.preventDefault();
										// In a real app, this would download a template file
										alert('Template download would start here');
									}}
									className="text-blue-700 hover:text-blue-900 underline"
								>
									Download template file
								</a>
							</div>
						</div>
					</div>
				</Card>

				{/* Quick Actions */}
				<div className="grid grid-cols-2 gap-3">
					<Button
						variant="outline"
						onClick={handleBrowseClick}
						className="flex items-center gap-2"
					>
						<Upload className="h-4 w-4" />
						Browse Files
					</Button>
					
					<Button
						variant="outline"
						onClick={() => {
							// Example data - in real app this would create and download a template
							const templateContent = `Instruction,Solution,Category
"Create a function that returns the sum of two numbers","def add(a, b):\n\treturn a + b","Python Basics"
"Write a function to check if a number is even","def is_even(n):\n\treturn n % 2 == 0","Python Basics"`;
							
							const blob = new Blob([templateContent], { type: 'text/csv' });
							const url = URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = 'data_science_questions_template.csv';
							document.body.appendChild(a);
							a.click();
							document.body.removeChild(a);
							URL.revokeObjectURL(url);
						}}
						className="flex items-center gap-2"
					>
						<Download className="h-4 w-4" />
						Get Template
					</Button>
				</div>
			</div>
		</Dialog>
	);
};

// Progress version for file processing
interface FileLoadProgressDialogProps {
	isOpen: boolean;
	onClose?: () => void;
	progress?: number;
	status?: string;
	fileName?: string;
	className?: string;
}

const FileLoadProgressDialog: React.FC<FileLoadProgressDialogProps> = ({
	isOpen,
	onClose,
	progress = 0,
	status = "Processing questions file...",
	fileName,
	className = '',
}) => {
	return (
		<Dialog
			isOpen={isOpen}
			onClose={onClose || (() => {})}
			title="Processing Questions"
			variant="default"
			showCancel={false}
			// ERROR FIX: Remove showConfirm
			// Error Line 382: showConfirm={false}
			onConfirm={undefined} // Explicitly set onConfirm to undefined to hide the confirm button
			showCloseButton={false}
			closeOnOverlayClick={false}
			className={className}
		>
			<div className="space-y-4"> {/* Kept as space-y-4, not adding scroll as content is fixed and small */}
				{/* File Info */}
				{fileName && (
					<div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
						<FileText className="h-5 w-5 text-blue-600" />
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-gray-900 truncate">
								{fileName}
							</p>
							<p className="text-xs text-gray-600">Processing...</p>
						</div>
					</div>
				)}

				{/* Progress Bar */}
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-gray-700">{status}</span>
						<span className="font-medium text-gray-900">{progress}%</span>
					</div>
					
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div 
							className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>

				{/* Processing Details */}
				<div className="text-xs text-gray-500 space-y-1">
					<p>• Parsing file content and structure</p>
					<p>• Validating question format</p>
					<p>• Importing into practice database</p>
					<p>• This may take a few moments...</p>
				</div>
			</div>
		</Dialog>
	);
};

// Success dialog after file load
interface FileLoadSuccessDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	stats?: {
		totalQuestions: number;
		categories: string[];
		errors?: number;
	};
	className?: string;
}

const FileLoadSuccessDialog: React.FC<FileLoadSuccessDialogProps> = ({
	isOpen,
	onClose,
	onConfirm,
	stats,
	className = '',
}) => {
	return (
		<Dialog
			isOpen={isOpen}
			onClose={onClose}
			title="Questions Loaded Successfully!"
			variant="success"
			confirmText="Start Practicing"
			cancelText="Load Another"
			onConfirm={onConfirm}
			// FIX: Change onCancel to onClose
			// Error Line 457: onCancel={onClose}
			showCloseButton={true}
			className={className}
		>
			<div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"> {/* ADDED max-h-[70vh] and overflow-y-auto */}
				{/* Success Icon */}
				<div className="text-center">
					<div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
						<CheckCircle2 className="h-8 w-8 text-green-600" />
					</div>
				</div>

				{/* Stats */}
				{stats && (
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center p-3 bg-green-50 rounded-lg">
							<div className="text-2xl font-bold text-green-600">
								{stats.totalQuestions}
							</div>
							<div className="text-xs text-green-800">Questions Loaded</div>
						</div>
						
						<div className="text-center p-3 bg-blue-50 rounded-lg">
							<div className="text-2xl font-bold text-blue-600">
								{stats.categories.length}
							</div>
							<div className="text-xs text-blue-800">Categories</div>
						</div>
					</div>
				)}

				{/* Categories List */}
				{stats?.categories && stats.categories.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-sm font-medium text-gray-900">Categories Found:</h4>
						<div className="flex flex-wrap gap-2">
							{stats.categories.slice(0, 6).map((category, index) => (
								<span
									key={index}
									className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
								>
									{category}
								</span>
							))}
							{stats.categories.length > 6 && (
								<span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
									+{stats.categories.length - 6} more
								</span>
							)}
						</div>
					</div>
				)}

				{/* Errors (if any) */}
				{stats?.errors && stats.errors > 0 && (
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
						<div className="flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-yellow-600" />
							<span className="text-sm font-medium text-yellow-800">
								{stats.errors} question(s) had formatting issues
							</span>
						</div>
						<p className="text-xs text-yellow-700 mt-1">
							These questions were skipped but you can still practice with the successfully loaded ones.
						</p>
					</div>
				)}

				<div className="text-center text-sm text-gray-600">
					<p>You're ready to start your practice session!</p>
				</div>
			</div>
		</Dialog>
	);
};

export { 
	FileLoadDialog, 
	FileLoadProgressDialog, 
	FileLoadSuccessDialog 
};
