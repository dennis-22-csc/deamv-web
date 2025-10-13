'use client';

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { NotebookUploadDialog } from '@/components/dialogs/NotebookUploadDialog'; 
import { 
    notebookProcessor, 
    isNotebookProcessorConfigured, // Check configuration
    NotebookUploadData 
} from '@/lib/notebookprocessor'; 
import { Button } from '@/components/ui/Button'; 

// --- Status Dialog Component (FIXED) ---
const StatusDialog: React.FC<{ isOpen: boolean, title: string, message: string, onClose: () => void }> = ({ isOpen, title, message, onClose }) => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h3 className={`text-lg font-bold ${title.startsWith('✅') ? 'text-green-600' : title.startsWith('❌') || title.startsWith('🛑') ? 'text-red-600' : 'text-gray-900'}`}>{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
            <div className="text-right">
                {/* FIX: Changed variant="default" to variant="secondary" or another defined variant */}
                <Button onClick={onClose} variant="secondary">Close</Button>
            </div>
        </div>
    </div>
);

// --- Main Page Component ---

const CLASS_OPTIONS = [
    'Class 1: Introduction to Data and Data Science', 
    'Class 2: Pandas Introduction'
];

export default function NotebookUploadPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState({ title: '', message: '', isOpen: false });

    // Helper to close all feedback dialogs
    const closeStatus = () => setStatus({ ...status, isOpen: false });

    // Function to handle the data submitted from the Dialog
    const handleConfirmUpload = async (data: NotebookUploadData) => {
        setIsDialogOpen(false); 
        
        setIsProcessing(true); 
        setStatus({
            isOpen: true,
            title: '⏳ Processing...',
            message: `Sending request to server to process notebook for ${data.firstName} ${data.lastName}...`,
        });

        try {
            // 1. Send data to the new API route
            const response = await fetch('/api/upload-notebook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            setIsProcessing(false);

            if (response.ok) { // Check for 2xx status code
                setStatus({
                    isOpen: true,
                    title: '✅ Upload Complete!',
                    message: result.message,
                });
            } else {
                // Handle non-2xx status (e.g., 400 or 500 errors from the API route)
                setStatus({
                    isOpen: true,
                    title: '⚠️ Upload Failed',
                    message: result.message || 'An unknown error occurred on the server.',
                });
            }
        } catch (error) {
            setIsProcessing(false);
            setStatus({
                isOpen: true,
                title: '🛑 Network Error',
                message: `Could not connect to the server: ${(error as Error).message}`,
            });
        }
    };


    return (
        // New layout for better centralization and full-height UI
        <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="w-full max-w-3xl text-center space-y-4 mb-12 mt-10">
                <h1 className="text-4xl font-extrabold text-gray-900 md:text-5xl">
                    <span className="text-blue-600">SFAI DV Colab</span> Notebook Submission
                </h1>
                <p className="text-lg text-gray-600">
                    Submit your completed Colab notebook by providing the required information and the public link.
                </p>
            </div>

            {/* Centralized Action Area */}
            <div className="flex flex-col items-center justify-center flex-grow w-full max-w-xl">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 w-full text-center space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-700">Ready to Submit?</h2>
                    <p className="text-md text-gray-500">
                        Click the button below to upload your notebook link and student information.
                    </p>

                    {/* The primary action button - now centralized */}
                    <Button 
                        onClick={() => setIsDialogOpen(true)}
                        disabled={isProcessing}
                        className="flex items-center justify-center mx-auto gap-2 px-8 py-4 text-xl font-bold bg-blue-600 hover:bg-blue-700 transition duration-150 shadow-md"
                    >
                        {isProcessing ? (
                            'Submitting...'
                        ) : (
                            <>
                                <Upload className="h-6 w-6" />
                                Submit Notebook Link
                            </>
                        )}
                    </Button>
                </div>
            </div>
            
            {/* --- Dialog Components --- */}

            {/* 1. Input Dialog */}
            <NotebookUploadDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onConfirm={handleConfirmUpload}
                classOptions={CLASS_OPTIONS}
            />

            {/* 2. Status/Feedback Dialog */}
            <StatusDialog
                isOpen={status.isOpen}
                title={status.title}
                message={status.message}
                onClose={closeStatus}
            />
        </div>
    );
}
