// app/category-selection/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Progress } from '@/components/ui/Progress';
import { practiceDatabase } from '@/lib/database';

const SHOULD_REFETCH_ALWAYS = process.env.NEXT_PUBLIC_NEW_PRACTICE_QUESTIONS_AVAILABLE === 'true';

interface CategorySelectionState {
  selectedCategory: string;
  categories: string[];
  hasLoadedQuestions: boolean;
  isLoading: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  downloadResult: {
    success: boolean;
    message: string;
    totalProcessed: number;
    totalFailed: number;
    categoriesFound: string[];
  } | null;
}

export default function CategorySelectionPage() {
  const [state, setState] = useState<CategorySelectionState>({
    selectedCategory: 'General',
    categories: ['General'],
    hasLoadedQuestions: false,
    isLoading: true,
    isDownloading: false,
    downloadProgress: 0,
    downloadResult: null,
  });

  const router = useRouter();

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      console.log('🔍 [CategorySelection] Loading initial data...');
      
      const [hasQuestions, categories] = await Promise.all([
        practiceDatabase.hasDataScienceChallenges(),
        practiceDatabase.getAllCategories(),
      ]);

      const allCategories = ['General', ...categories.filter(cat => cat !== 'General')];
      
      console.log(`✅ [CategorySelection] Initial data loaded - Has questions: ${hasQuestions}, Categories: ${allCategories.length}`);
      
      setState(prev => ({
        ...prev,
        hasLoadedQuestions: hasQuestions,
        categories: allCategories,
        isLoading: false,
      }));
      
      // Return the current state of questions for the useEffect logic
      return hasQuestions; 
    } catch (error) {
      console.error('❌ [CategorySelection] Error loading initial data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false; // Indicate failure
    }
  }, []);

  /**
   * Clear existing questions before saving new ones
   */
  const clearExistingQuestions = useCallback(async () => {
    try {
      console.log('🗑️ [CategorySelection] Clearing existing questions...');
      await practiceDatabase.clearDataScienceChallenges();
      console.log('✅ [CategorySelection] Existing questions cleared');
      return true;
    } catch (error) {
      console.error('❌ [CategorySelection] Error clearing existing questions:', error);
      return false;
    }
  }, []);

  /**
   * Save questions to client-side storage
   */
  const saveQuestionsToStorage = useCallback(async (questions: any[]) => {
    console.log('💾 [CategorySelection] Saving questions to client storage:', questions.length);
    
    let savedCount = 0;
    let failedCount = 0;

    // Process questions in batches to avoid overwhelming the storage
    const batchSize = 5;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      // Process each question in the batch
      for (const question of batch) {
        try {
          console.log(`💾 [CategorySelection] Saving question ${savedCount + 1}/${questions.length}`);
          
          await practiceDatabase.addDataScienceChallenge(
            question.Question,
            question.Answer,
            question.Category
          );
          savedCount++;
          
          // Update progress for each question saved
          const progress = 80 + Math.floor((savedCount / questions.length) * 20);
          setState(prev => ({ ...prev, downloadProgress: progress }));
          
        } catch (error) {
          console.error(`❌ [CategorySelection] Failed to save question:`, error);
          failedCount++;
        }
      }
      
      // Small delay between batches to prevent overwhelming the storage
      if (i + batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ [CategorySelection] Storage result: ${savedCount} saved, ${failedCount} failed`);
    return { saved: savedCount, failed: failedCount };
  }, []);

  /**
   * Download practice questions via API route and save to client storage
   */
  const downloadPracticeQuestions = useCallback(async () => {
    console.log('🚀 [CategorySelection] Starting practice questions download via API...');
    
    setState(prev => ({ 
      ...prev, 
      isDownloading: true,
      downloadProgress: 0,
      downloadResult: null,
    }));

    try {
      // Initial progress - starting download
      setState(prev => ({ ...prev, downloadProgress: 10 }));
      
      // Step 1: Clear existing questions before downloading new ones
      console.log('🗑️ [CategorySelection] Clearing existing questions before download...');
      setState(prev => ({ ...prev, downloadProgress: 20 }));
      
      const clearSuccess = await clearExistingQuestions();
      if (!clearSuccess) {
        throw new Error('Failed to clear existing questions');
      }
      
      // Step 2: Download new questions
      console.log('🔍 [CategorySelection] Calling practice questions API...');
      setState(prev => ({ ...prev, downloadProgress: 40 }));
      
      const response = await fetch('/api/practice-questions');
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();

      // Progress update - data received
      setState(prev => ({ ...prev, downloadProgress: 60 }));

      console.log('🔍 [CategorySelection] API response:', {
        success: result.success,
        questionCount: result.questions?.length,
        error: result.error
      });

      if (result.success && result.questions && result.questions.length > 0) {
        console.log('🔍 [CategorySelection] Saving questions to client storage...');
        
        // Save questions to client-side storage
        const storageResult = await saveQuestionsToStorage(result.questions);
        
        console.log('✅ [CategorySelection] Storage completed:', storageResult);

        setState(prev => ({
          ...prev,
          isDownloading: false,
          downloadResult: {
            success: storageResult.failed === 0,
            message: storageResult.failed === 0 
              ? `Successfully downloaded and saved ${storageResult.saved} questions`
              : `Downloaded ${result.questions.length} questions (${storageResult.saved} saved, ${storageResult.failed} failed)`,
            totalProcessed: storageResult.saved,
            totalFailed: storageResult.failed,
            categoriesFound: result.categoriesFound || [],
          },
        }));

        console.log('✅ [CategorySelection] Files processed successfully, reloading initial data...');
        // Reload categories and update hasLoadedQuestions
        await loadInitialData();
      } else {
        setState(prev => ({ ...prev, downloadProgress: 100 }));
        
        const errorMessage = result.error 
          ? `Download failed: ${result.error}`
          : 'Download failed - no questions received from server';
        
        setState(prev => ({
          ...prev,
          isDownloading: false,
          downloadResult: {
            success: false,
            message: errorMessage,
            totalProcessed: 0,
            totalFailed: result.questions?.length || 0,
            categoriesFound: result.categoriesFound || [],
          },
        }));
        console.error('❌ [CategorySelection] API download failed:', result.error);
      }

    } catch (error) {
      console.error('❌ [CategorySelection] Critical error during API call:', error);
      setState(prev => ({ 
        ...prev, 
        isDownloading: false,
        downloadProgress: 100,
        downloadResult: {
          success: false,
          message: error instanceof Error ? error.message : 'A critical error occurred during download.',
          totalProcessed: 0,
          totalFailed: 0,
          categoriesFound: [],
        },
      }));
    }
  }, [loadInitialData, saveQuestionsToStorage, clearExistingQuestions]);

  // FIX: Modify useEffect to respect the environment variable
  useEffect(() => {
    const initializePage = async () => {
      // 1. Load initial data (check if questions exist)
      const hasQuestions = await loadInitialData();
      
      // 2. Determine if automatic download is needed
      const shouldAutoDownload = SHOULD_REFETCH_ALWAYS || !hasQuestions;

      if (shouldAutoDownload) {
        console.log(`⚠️ [CategorySelection] Auto-downloading questions because: ${SHOULD_REFETCH_ALWAYS ? 'New questions flag is TRUE' : 'No local questions found'}`);
        await downloadPracticeQuestions();
      } else {
        console.log('✅ [CategorySelection] Questions found locally and no forced update. Ready to practice.');
      }
    };

    initializePage();
  }, [loadInitialData, downloadPracticeQuestions]); // Dependencies remain correct
  // END FIX

  /**
   * Handle initial download click
   */
  const handleInitialDownloadClick = () => {
    downloadPracticeQuestions();
  };

  /**
   * Retry download if previous attempt failed
   */
  const handleRetryDownload = () => {
    downloadPracticeQuestions();
  };

  /**
   * Clear download result and reset state
   */
  const handleClearDownload = () => {
    setState(prev => ({
      ...prev,
      downloadResult: null,
    }));
  };

  /**
   * Handle category change
   */
  const handleCategoryChange = (category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }));
  };

  /**
   * Start practice session
   */
  const handleStartPractice = async () => {
    if (!state.hasLoadedQuestions) {
      console.error('❌ [CategorySelection] Cannot start practice - no questions loaded');
      return;
    }
    
    try {
      // Verify we have questions for the selected category
      const categoryQuestions = await practiceDatabase.getDataScienceChallengesByCategory(state.selectedCategory);
      
      if (categoryQuestions.length === 0) {
        console.warn(`⚠️ [CategorySelection] No questions found for category: ${state.selectedCategory}`);
        // Still navigate - the practice page will handle empty state
      }
      
      console.log(`🚀 [CategorySelection] Starting practice for category: ${state.selectedCategory}`);
      router.push(`/practice?category=${encodeURIComponent(state.selectedCategory)}`);
    } catch (error) {
      console.error('❌ [CategorySelection] Error starting practice:', error);
    }
  };

  /**
   * Clear all questions and reset to initial state
   */
  const handleClearAllQuestions = async () => {
    try {
      console.log('🗑️ [CategorySelection] Clearing all questions...');
      await practiceDatabase.clearDataScienceChallenges();
      
      // Reset state
      setState(prev => ({
        ...prev,
        hasLoadedQuestions: false,
        categories: ['General'],
        selectedCategory: 'General',
        downloadResult: null,
      }));
      
      console.log('✅ [CategorySelection] All questions cleared');
    } catch (error) {
      console.error('❌ [CategorySelection] Error clearing questions:', error);
    }
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
                Choose a category to start your practice session. Questions are automatically loaded from our question bank.
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
              {state.isDownloading ? (
                // 1. DOWNLOADING: Show download progress
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Downloading practice questions...</span>
                      <span>{state.downloadProgress}%</span>
                    </div>
                    <Progress value={state.downloadProgress} className="h-2" />
                    <p className="text-xs text-gray-500">
                      {state.downloadProgress < 20 ? 'Clearing existing questions...' :
                       state.downloadProgress < 60 ? 'Fetching from Server...' : 
                       state.downloadProgress < 80 ? 'Processing questions...' : 
                       'Saving to local storage...'}
                    </p>
                  </div>
                </div>
              ) : state.downloadResult ? (
                // 2. DOWNLOAD COMPLETE: Show result and next steps
                <div className="text-center space-y-3">
                  <div className={`p-3 rounded-lg ${
                    state.downloadResult.success 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <p className="font-medium">{state.downloadResult.message}</p>
                    {state.downloadResult.totalFailed > 0 && (
                      <p className="text-sm mt-1 text-amber-700">
                        {state.downloadResult.totalFailed} questions failed to save
                      </p>
                    )}
                  </div>
                  
                  {state.downloadResult.success || state.downloadResult.totalProcessed > 0 ? (
                    // Success or partial success: Show practice button
                    <div className="space-y-2">
                      <Button
                        onClick={handleStartPractice}
                        className="w-full flex items-center justify-center gap-2"
                        size="lg"
                        disabled={!state.hasLoadedQuestions}
                      >
                        <Play className="h-5 w-5" />
                        Start Practice
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleRetryDownload}
                          className="flex-1"
                          size="sm"
                        >
                          <Download className="h-4 w-4" />
                          Refetch Questions
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Complete failure: Show retry options
                    <div className="space-y-2">
                      <Button
                        onClick={handleRetryDownload}
                        className="w-full flex items-center justify-center gap-2"
                        size="lg"
                      >
                        <Download className="h-5 w-5" />
                        Retry Download
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleClearDownload}
                        className="w-full"
                        size="sm"
                      >
                        Try Again
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleInitialDownloadClick}
                      className="flex-1"
                      size="sm"
                    >
                      <Download className="h-4 w-4" />
                      Reload Questions
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClearAllQuestions}
                      className="flex-1 text-red-600 hover:text-red-700"
                      size="sm"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              ) : (
                // 4. NO QUESTIONS LOADED: Show initial download button
                <Button
                  onClick={handleInitialDownloadClick}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Download className="h-5 w-5" />
                  Download Practice Questions
                </Button>
              )}

              {!state.hasLoadedQuestions && !state.downloadResult && !state.isDownloading && (
                <p className="text-sm text-red-600">
                  Please download practice questions to begin.
                </p>
              )}
            </div>

            {/* Stats - Only show when we have loaded questions */}
            {state.hasLoadedQuestions && !state.isDownloading && !state.downloadResult && (
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 font-bold text-lg">
                    {state.categories.length - 1}
                  </div>
                  <div className="text-xs text-blue-800">Categories Available</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 font-bold text-lg">
                    {state.selectedCategory}
                  </div>
                  <div className="text-xs text-green-800">Selected Category</div>
                </div>
              </div>
            )}

            {/* Information Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-blue-800 mb-2">Practice Information</h4>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Questions are loaded automatically from our question bank</li>
                <li>• Each category contains hands-on practice questions</li>
                <li>• You can practice at your own pace</li>
                <li>• Reload questions to get the latest updates</li>
                {state.hasLoadedQuestions && (
                  <li className="text-green-700 font-medium">
                    • {state.categories.length - 1} categories loaded and ready for practice!
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
