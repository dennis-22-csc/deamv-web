'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FileLoadDialog } from '@/components/dialogs/FileLoadDialog';
import { ProgressDialog } from '@/components/dialogs/ProgressDialog';
import { practiceDatabase } from '@/lib/database';
import { processTxtFile } from '@/lib/fileProcessor';

interface CategorySelectionState {
  selectedCategory: string;
  categories: string[];
  hasLoadedQuestions: boolean;
  isLoading: boolean;
  isProcessingFile: boolean;
  showFileLoadDialog: boolean;
  selectedFile: File | null;
  processingResult: {
    success: boolean;
    message: string;
  } | null;
}

export default function CategorySelectionPage() {
  const [state, setState] = useState<CategorySelectionState>({
    selectedCategory: 'General',
    categories: ['General'],
    hasLoadedQuestions: false,
    isLoading: true,
    isProcessingFile: false,
    showFileLoadDialog: false,
    selectedFile: null,
    processingResult: null,
  });

  const router = useRouter();

  // Load initial data
  useEffect(() => {
    loadInitialData();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.csv,text/plain';
    (window as any).fileInput = fileInput;
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const [hasQuestions, categories] = await Promise.all([
        practiceDatabase.hasDataScienceChallenges(),
        practiceDatabase.getAllCategories(),
      ]);

      const allCategories = ['General', ...categories.filter(cat => cat !== 'General')];
      
      setState(prev => ({
        ...prev,
        hasLoadedQuestions: hasQuestions,
        categories: allCategories,
        isLoading: false,
        showFileLoadDialog: !hasQuestions, 
      }));
    } catch (error) {
      console.error('Error loading initial data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // --- File Handling Functions ---

  /**
   * Process file immediately when selected and persist to database
   */
  const processFileImmediately = useCallback(async (file: File) => {
    console.log('🚀 [pages.tsx] processFileImmediately called with file:', file.name);
    
    setState(prev => ({ 
      ...prev, 
      isProcessingFile: true, 
      selectedFile: file,
      processingResult: null,
    }));

    try {
      console.log('🔍 [pages.tsx] Calling processTxtFile for immediate persistence...');
      const result = await processTxtFile(file, 'data_science');
      console.log('🔍 [pages.tsx] Immediate file processing result:', result);
      
      // Update state with processing result
      setState(prev => ({
        ...prev,
        isProcessingFile: false,
        processingResult: {
          success: result.success,
          message: result.message,
        },
      }));

      if (result.success) {
        console.log('✅ [pages.tsx] File persisted successfully, reloading initial data...');
        // Reload categories and update hasLoadedQuestions
        await loadInitialData();
        
        // Show success message
        alert(`Success! ${result.message}`);
      } else {
        console.error('❌ [pages.tsx] File processing failed:', result.message);
        alert(`Error processing file: ${result.message}`);
      }

    } catch (error) {
      console.error('❌ [pages.tsx] Critical error during file processing:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessingFile: false,
        processingResult: {
          success: false,
          message: 'A critical error occurred during file processing.',
        },
      }));
      alert('A critical error occurred during file processing. Please try again.');
    }
  }, [loadInitialData]);

  const handleFileCapture = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      console.log('🔍 [pages.tsx] File selected, starting immediate processing...');
      // Process file immediately when selected
      processFileImmediately(file);
      setState(prev => ({ 
        ...prev, 
        showFileLoadDialog: false,
      }));
    } else {
      handleFileLoadCancelled();
    }
    target.value = '';
  };

  const handleOpenFilePicker = () => {
    const fileInput = (window as any).fileInput || document.createElement('input');
    fileInput.onchange = handleFileCapture;
    fileInput.click();
  };

  // --- Other Functions ---

  const handleCategoryChange = (category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }));
  };

  const handleStartPractice = async () => {
    router.push(`/practice?category=${encodeURIComponent(state.selectedCategory)}`);
  };

  const handleFileLoadCancelled = () => {
    setState(prev => ({ 
      ...prev, 
      showFileLoadDialog: false, 
      selectedFile: null,
      processingResult: null,
    }));
    
    // Only redirect if no questions are loaded and user cancels file selection
    if (!state.hasLoadedQuestions) {
      router.push('/');
    }
  };

  /**
   * Handle file selection from dialog - process immediately
   */
  const handleFileLoadConfirmed = (fileFromDialog?: File) => {
    setState(prev => ({ ...prev, showFileLoadDialog: false })); 

    if (fileFromDialog) {
      console.log('🔍 [pages.tsx] File from dialog, starting immediate processing...');
      // Process file immediately when selected via drag-and-drop
      processFileImmediately(fileFromDialog);
    } else {
      // Clicked 'Open File Browser': trigger picker (which will process immediately)
      handleOpenFilePicker();
    }
  };
  
  const handleInitialLoadClick = () => {
    setState(prev => ({ ...prev, showFileLoadDialog: true }));
  };

  /**
   * Retry processing if previous attempt failed
   */
  const handleRetryProcessing = () => {
    if (state.selectedFile) {
      processFileImmediately(state.selectedFile);
    }
  };

  /**
   * Clear current file selection and result
   */
  const handleClearFile = () => {
    setState(prev => ({
      ...prev,
      selectedFile: null,
      processingResult: null,
    }));
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking for existing questions...</p>
        </div>
      </div>
    );
  }
    
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Practice Categories
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <div className="space-y-8">
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Select Practice Category
              </h2>
              <p className="text-gray-600">
                Choose a category or upload a file to start your practice session
              </p>
            </div>

            {/* Category Selector */}
            <div className="max-w-md mx-auto space-y-4">
              <Select
                value={state.selectedCategory}
                onValueChange={handleCategoryChange}
                options={state.categories.map(category => ({
                  value: category,
                  label: category,
                }))}
                placeholder="Select a category"
              />
              
              {/* Conditional Button based on state */}
              {state.isProcessingFile ? (
                // 1. PROCESSING: Show processing state
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600">
                    Processing file: {state.selectedFile?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Please wait while we save your questions...
                  </p>
                </div>
              ) : state.processingResult ? (
                // 2. PROCESSING COMPLETE: Show result and next steps
                <div className="text-center space-y-3">
                  <div className={`p-3 rounded-lg ${
                    state.processingResult.success 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <p className="font-medium">{state.processingResult.message}</p>
                  </div>
                  
                  {state.processingResult.success ? (
                    // Success: Show practice button
                    <div className="space-y-2">
                      <Button
                        onClick={handleStartPractice}
                        className="w-full flex items-center justify-center gap-2"
                        size="lg"
                      >
                        <Play className="h-5 w-5" />
                        Start Practice
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleClearFile}
                        className="w-full"
                        size="sm"
                      >
                        Load Different File
                      </Button>
                    </div>
                  ) : (
                    // Failure: Show retry options
                    <div className="space-y-2">
                      <Button
                        onClick={handleRetryProcessing}
                        className="w-full flex items-center justify-center gap-2"
                        size="lg"
                      >
                        <Play className="h-5 w-5" />
                        Retry Processing
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleClearFile}
                        className="w-full"
                        size="sm"
                      >
                        Try Different File
                      </Button>
                    </div>
                  )}
                </div>
              ) : state.hasLoadedQuestions ? (
                // 3. QUESTIONS ALREADY LOADED: Show normal Start button
                <div className="space-y-3">
                  <Button
                    onClick={handleStartPractice}
                    className="w-full flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <Play className="h-5 w-5" />
                    Start Practice
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleInitialLoadClick}
                    className="w-full"
                    size="sm"
                  >
                    Load New Questions File
                  </Button>
                </div>
              ) : (
                // 4. NO QUESTIONS LOADED: Show initial file load button
                <Button
                  onClick={handleInitialLoadClick}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  Load Questions File
                </Button>
              )}

              {!state.hasLoadedQuestions && !state.selectedFile && !state.processingResult && (
                <p className="text-sm text-red-600">
                  Please load a questions file to begin.
                </p>
              )}
            </div>

            {/* Stats - Only show when we have loaded questions */}
            {state.hasLoadedQuestions && !state.isProcessingFile && !state.processingResult && (
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 font-bold text-lg">
                    {state.categories.length - 1}
                  </div>
                  <div className="text-xs text-blue-800">Categories</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 font-bold text-lg">
                    {state.selectedCategory}
                  </div>
                  <div className="text-xs text-green-800">Selected</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* File Load Dialog */}
        <FileLoadDialog
          isOpen={state.showFileLoadDialog}
          onClose={handleFileLoadCancelled}
          onConfirm={handleFileLoadConfirmed} 
          title="Load Questions File"
          message="Select a .txt or .csv file containing your data science challenges. The questions will be loaded into your browser for practice."
        />
        
        {/* Progress Dialog */}
        <ProgressDialog
          isOpen={state.isProcessingFile}
          title="Processing Questions"
          message={`Processing file: ${state.selectedFile?.name || 'Loading'}. Please wait...`}
        />
      </main>
    </div>
  );
}
