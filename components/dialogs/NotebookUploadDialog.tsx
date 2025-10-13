import React, { useState } from 'react';
import {
	Upload,
	FileText,
	X,
	CheckCircle2,
	AlertCircle,
	Download,
	HelpCircle,
    User,
    BookOpen,
    Key 
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}
const Input: React.FC<InputProps> = ({ label, ...props }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input {...props} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: string[];
}
const Select: React.FC<SelectProps> = ({ label, options, ...props }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <select {...props} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
        	<option value="" disabled>Select a class</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);


// 1. UPDATED INTERFACE to include registrationCode
interface NotebookUploadData {
    firstName: string;
    lastName: string;
    className: string;
    notebookUrl: string;
    registrationCode: string; // <-- NEW FIELD
}

interface NotebookUploadDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (data: NotebookUploadData) => void;
	title?: string;
	classOptions: string[]; // e.g., ['Class 1', 'Class 2', 'Class 3']
	className?: string;
}

const NotebookUploadDialog: React.FC<NotebookUploadDialogProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title = "Submit Colab Notebook Link",
	classOptions,
	className = '',
}) => {
	const [formData, setFormData] = useState<NotebookUploadData>({
		firstName: '',
		lastName: '',
		className: '',
		notebookUrl: '',
        registrationCode: '', // <-- INITIALIZE NEW FIELD
	});
	const [error, setError] = useState('');

	const resetState = () => {
		setFormData({
			firstName: '',
			lastName: '',
			className: '',
			notebookUrl: '',
            registrationCode: '', // <-- RESET NEW FIELD
		});
		setError('');
	};

	const handleClose = () => {
		resetState();
		onClose();
	};

	// 3. UPDATED VALIDATION to check for registrationCode
	const validateForm = (data: NotebookUploadData): boolean => {
		if (!data.firstName.trim()) {
			setError("First Name is required.");
			return false;
		}
		if (!data.lastName.trim()) {
			setError("Last Name is required.");
			return false;
		}
		if (!data.className) {
			setError("Class is required.");
			return false;
		}
        if (!data.registrationCode.trim()) { // <-- NEW VALIDATION CHECK
			setError("Registration Code is required for submission authorization.");
			return false;
		}
		if (!data.notebookUrl.trim() || !data.notebookUrl.includes('colab.research.google.com/drive/')) {
			setError("Please enter a valid Google Colab/Jupyter Notebook link.");
			return false;
		}

		setError('');
		return true;
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
		setError(''); // Clear error on change
	};

	const handleConfirm = () => {
		if (validateForm(formData)) {
			onConfirm(formData);
			// The validation check here ensures onConfirm only runs if the data is valid.
		}
	};
    
    // isConfirmDisabled is now unused but harmless to keep defined.
    const isConfirmDisabled = !formData.firstName || !formData.lastName || !formData.className || !formData.notebookUrl || !formData.registrationCode;


	return (
		<Dialog
			isOpen={isOpen}
			onClose={handleClose}
			title={title}
			variant="default"
			confirmText="Submit Link"
			cancelText="Cancel"
			onConfirm={handleConfirm}
			showCloseButton={true}
			// REMOVED: confirmDisabled={isConfirmDisabled} (This was the problematic prop)
			className={className}
		>
			<div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

				{/* Description */}
				<p className="text-gray-600 text-sm leading-relaxed flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-500 flex-shrink-0" />
					Please provide the necessary details
				</p>

				{/* User/Class Info */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="e.g., Jane"
                        maxLength={50}
                    />
                    <Input
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="e.g., Doe"
                        maxLength={50}
                    />
                </div>
                
                {/* Registration Code Input */}
                <Input
                    label="Registration Code"
                    name="registrationCode"
                    value={formData.registrationCode}
                    onChange={handleChange}
                    placeholder="Enter your registration code"
                    maxLength={100}
                />
                
                <Select
                    label="Associated Class"
                    name="className"
                    value={formData.className}
                    onChange={handleChange}
                    options={classOptions}
                />
                
				{/* Notebook Link Input */}
                <Input
                    label="Colab Notebook Link"
                    name="notebookUrl"
                    value={formData.notebookUrl}
                    onChange={handleChange}
                    placeholder="e.g., https://colab.research.google.com/drive/..."
                />


				{/* Error Message */}
				{error && (
					<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
						<AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
						<p className="text-sm text-red-600">{error}</p>
					</div>
				)}

				{/* File Requirements Card */}
				<Card className="bg-blue-50 border-blue-200">
					<div className="space-y-3">
						
						
                            <p className='text-xs'>
                                <strong>Note:</strong> Ensure your Colab link is <strong>Publicly viewable</strong> for the submission to succeed.
                            </p>
						
					</div>
				</Card>
			</div>
		</Dialog>
	);
};

export { NotebookUploadDialog, type NotebookUploadData };
