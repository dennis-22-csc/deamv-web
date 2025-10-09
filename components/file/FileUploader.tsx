import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ProgressDialog } from '@/components/dialogs/ProgressDialog';

// --- NEW IMPORTS ---
// Assuming fileProcessor is located in the same directory or a known path like '../utils/fileProcessor'
import { quickProcessFile, FileProcessingResult as ProcessorResult } from '../utils/fileProcessor';

// NOTE: We keep the component's FileProcessingResult interface but align it to the processor's output.
// The processor's interface is imported as ProcessorResult to avoid naming conflicts.
// -------------------

interface FileUploaderProps {
  onFileProcessed: (result: FileProcessingResult) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
  allowedExtensions?: string[];
  className?: string;
  multiple?: boolean;
}

// Updated interface to match the structure expected by the FileUploader component (includes stats)
export interface FileProcessingResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  stats?: {
    total: number;
    processed: number;
    failed: number;
    categories: string[];
  };
}

interface FileInfo {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: FileProcessingResult;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileProcessed,
  acceptedFileTypes = ['.txt', '.csv', 'text/plain'],
  maxFileSize = 10,
  allowedExtensions = ['txt', 'csv'],
  className = '',
  multiple = false,
}) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('🔍 [FileUploader] Component render - files:', files.length, 'processing:', isProcessing);

  // Log state changes
  useEffect(() => {
    console.log('🔍 [FileUploader] Files state updated:', files.map(f => ({
      name: f.file.name,
      status: f.status,
      progress: f.progress
    })));
  }, [files]);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    console.log(`🔍 [FileUploader] Validating file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    
    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidType = acceptedFileTypes.some(type => 
      type.startsWith('.') ? `.${fileExtension}` === type : file.type === type
    );

    if (!isValidType) {
      console.warn(`❌ [FileUploader] File type validation failed for ${file.name}`);
      return { 
        isValid: false, 
        error: `File type not supported. Allowed: ${acceptedFileTypes.join(', ')}` 
      };
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      console.warn(`❌ [FileUploader] File size validation failed for ${file.name}: ${fileSizeMB.toFixed(2)}MB > ${maxFileSize}MB`);
      return { 
        isValid: false, 
        error: `File size must be less than ${maxFileSize}MB` 
      };
    }

    // Check extension
    if (fileExtension && !allowedExtensions.includes(fileExtension)) {
      console.warn(`❌ [FileUploader] File extension validation failed for ${file.name}: ${fileExtension}`);
      return { 
        isValid: false, 
        error: `File extension not allowed. Allowed: ${allowedExtensions.join(', ')}` 
      };
    }

    console.log(`✅ [FileUploader] File validation passed for ${file.name}`);
    return { isValid: true };
  };

  const handleFilesSelected = (selectedFiles: FileList) => {
    console.log('🚀 [FileUploader] handleFilesSelected called with files:', selectedFiles.length);

    const newFiles: FileInfo[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const validation = validateFile(file);
      
      if (validation.isValid) {
        console.log(`✅ [FileUploader] Adding valid file: ${file.name}`);
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          status: 'pending',
          progress: 0,
        });
      } else {
        // Show error for invalid files
        console.warn(`❌ [FileUploader] File ${file.name} rejected:`, validation.error);
      }
    }

    if (!multiple && newFiles.length > 0) {
      console.log('🔍 [FileUploader] Multiple files disabled, keeping only first file');
      setFiles([newFiles[0]]);
    } else {
      console.log('🔍 [FileUploader] Setting new files state');
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    console.log('🔍 [FileUploader] File dropped, processing files...');
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      console.log('🔍 [FileUploader] File input changed, processing files...');
      handleFilesSelected(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const removeFile = (fileId: string) => {
    console.log('🔍 [FileUploader] Removing file with ID:', fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAllFiles = () => {
    console.log('🔍 [FileUploader] Clearing all files');
    setFiles([]);
  };

  /**
   * REPLACED: Calls the actual fileProcessor's quickProcessFile function.
   * NOTE: We assume quickProcessFile handles all progress internally without callbacks,
   * so we will use a small progress simulation for the UI.
   */
  const processFile = async (fileInfo: FileInfo): Promise<FileProcessingResult> => {
    console.log(`🚀 [FileUploader] processFile started for: ${fileInfo.file.name}`);

    // Simulate progress for better UX while waiting for async processor
    const totalProgressSteps = 95;
    let currentProgress = 0;
    const interval = setInterval(() => {
      if (currentProgress < totalProgressSteps) {
        currentProgress += 5;
        setFiles(prev => prev.map(f => 
          f.id === fileInfo.id ? { ...f, progress: currentProgress } : f
        ));
      }
    }, 500);

    try {
      console.log('🔍 [FileUploader] Calling quickProcessFile...');
      // --- REAL PROCESSING CALL ---
      const result: ProcessorResult = await quickProcessFile(fileInfo.file);
      // --------------------------

      console.log('✅ [FileUploader] quickProcessFile completed with result:', {
        success: result.success,
        message: result.message,
        totalProcessed: result.totalProcessed,
        totalFailed: result.totalFailed,
        categoriesFound: result.categoriesFound,
        errors: result.errors
      });

      clearInterval(interval);

      // Map the processor's result to the component's expected interface
      const finalResult: FileProcessingResult = {
        success: result.success,
        message: result.message,
        errors: result.errors.length > 0 ? result.errors : undefined,
        stats: {
          total: result.totalProcessed + result.totalFailed,
          processed: result.totalProcessed,
          failed: result.totalFailed,
          categories: result.categoriesFound,
        },
      };

      console.log('🔍 [FileUploader] Mapped final result:', finalResult);
      return finalResult;

    } catch (error) {
      console.error('❌ [FileUploader] Error in processFile:', error);
      clearInterval(interval);
      throw error;
    }
  };

  const processAllFiles = async () => {
    console.log('🚀 [FileUploader] processAllFiles started');
    
    if (files.length === 0) {
      console.warn('⚠️ [FileUploader] No files to process');
      return;
    }

    setIsProcessing(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    console.log('🔍 [FileUploader] Processing files:', pendingFiles.map(f => ({
      name: f.file.name,
      size: f.file.size,
      type: f.file.type
    })));

    for (const fileInfo of pendingFiles) {
      console.log(`🔍 [FileUploader] Starting processing for: ${fileInfo.file.name}`);
      
      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === fileInfo.id ? { ...f, status: 'processing', progress: 5 } : f
      ));

      try {
        console.log(`🔍 [FileUploader] Calling processFile for: ${fileInfo.file.name}`);
        const result = await processFile(fileInfo);
        
        // Update file with result
        setFiles(prev => prev.map(f => 
          f.id === fileInfo.id ? { 
            ...f, 
            status: result.success ? 'completed' : 'error',
            progress: 100,
            result 
          } : f
        ));

        console.log(`✅ [FileUploader] File processing completed for ${fileInfo.file.name}:`, result.success);

        // Notify parent component
        console.log('🔍 [FileUploader] Notifying parent component of file processing result');
        onFileProcessed(result);
      } catch (error) {
        console.error(`❌ [FileUploader] Error processing file ${fileInfo.file.name}:`, error);
        
        const errorResult: FileProcessingResult = {
          success: false,
          message: 'Failed to process file due to an unexpected error.',
          errors: [error instanceof Error ? error.message : 'Unknown error during file processing'],
        };

        setFiles(prev => prev.map(f => 
          f.id === fileInfo.id ? { 
            ...f, 
            status: 'error',
            progress: 100,
            result: errorResult 
          } : f
        ));

        console.log('🔍 [FileUploader] Notifying parent component of error result');
        onFileProcessed(errorResult);
      }
    }

    console.log('✅ [FileUploader] processAllFiles completed');
    setIsProcessing(false);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return <Database className="h-5 w-5 text-green-600" />;
      case 'txt':
        return <FileText className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: FileInfo['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: FileInfo['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'processing':
        return <div className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasPendingFiles = files.some(f => f.status === 'pending');
  const hasFiles = files.length > 0;

  console.log('🔍 [FileUploader] Render state - hasFiles:', hasFiles, 'hasPendingFiles:', hasPendingFiles);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card className={`p-6 border-2 border-dashed transition-colors ${
        isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
      }`}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="text-center cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes.join(',')}
            onChange={handleInputChange}
            multiple={multiple}
            className="hidden"
          />

          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drop your questions file here
              </h3>
              <p className="text-gray-600 mb-4">
                or click to browse files
              </p>
            </div>

            <div className="text-sm text-gray-500 space-y-1">
              <p>Supported: {acceptedFileTypes.join(', ')}</p>
              <p>Max size: {maxFileSize}MB</p>
              {multiple && <p>Multiple files allowed</p>}
            </div>

            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🔍 [FileUploader] Browse files button clicked');
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-2 mx-auto"
            >
              <Upload className="h-4 w-4" />
              Browse Files
            </Button>
          </div>
        </div>
      </Card>

      {/* File List */}
      {hasFiles && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              Selected Files ({files.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFiles}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
            <TemplateDownload templateType="csv" />
          </div>

          <div className="space-y-3">
            {files.map((fileInfo) => (
              <div
                key={fileInfo.id}
                className={`flex items-center gap-3 p-3 border rounded-lg ${getStatusColor(fileInfo.status)}`}
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(fileInfo.file.name)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate">
                      {fileInfo.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatFileSize(fileInfo.file.size)}
                      </span>
                      <button
                        onClick={() => removeFile(fileInfo.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(fileInfo.status === 'processing' || fileInfo.status === 'pending') && (
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${fileInfo.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Status Message */}
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(fileInfo.status)}
                    <span className="text-xs">
                      {fileInfo.status === 'completed' && fileInfo.result?.message || 'Processing complete'}
                      {fileInfo.status === 'error' && fileInfo.result?.message || 'Processing failed'}
                      {fileInfo.status === 'processing' && `Processing... ${fileInfo.progress}%`}
                      {fileInfo.status === 'pending' && 'Ready to process'}
                    </span>
                  </div>

                  {/* Result Details */}
                  {fileInfo.result?.stats && (
                    <div className="mt-2 text-xs">
                      {fileInfo.result.success ? (
                        <div className="text-green-700">
                          <div className="flex gap-4 mt-1">
                            <span>Questions: {fileInfo.result.stats.processed}/{fileInfo.result.stats.total}</span>
                            <span>Categories: {fileInfo.result.stats.categories.length}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-700">
                          {fileInfo.result.errors?.map((error, index) => (
                            <div key={index}>• {error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Process Button */}
          {hasPendingFiles && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => {
                  console.log('🔍 [FileUploader] Process button clicked');
                  processAllFiles();
                }}
                disabled={isProcessing}
                loading={isProcessing}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Process {files.filter(f => f.status === 'pending').length} File(s)
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Processing Dialog */}
      <ProgressDialog
        isOpen={isProcessing}
        title="Processing Files"
        message="Please wait while we process your questions files..."
        // Calculate average progress across all files
        progress={files.length > 0 ? files.reduce((acc, f) => acc + f.progress, 0) / files.length : 0}
        type="processing"
        showCancelButton={false} // Typically hide cancel when using a non-cancellable async call
        onCancel={() => setIsProcessing(false)}
      />
    </div>
  );
};

// File Preview Component
interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  className = '',
}) => {
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    const readFile = async () => {
      if (file.type.startsWith('text/')) {
        const text = await file.text();
        setPreview(text.slice(0, 500) + (text.length > 500 ? '...' : ''));
      }
    };

    readFile();
  }, [file]);

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm">{file.name}</span>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {preview && (
        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-3 w-3 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Preview</span>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
            {preview}
          </pre>
        </div>
      )}
    </Card>
  );
};

// Template Download Component
interface TemplateDownloadProps {
  templateType?: 'csv' | 'txt';
  className?: string;
}

export const TemplateDownload: React.FC<TemplateDownloadProps> = ({
  templateType = 'csv',
  className = '',
}) => {
  const downloadTemplate = () => {
    console.log(`🔍 [FileUploader] Downloading ${templateType} template`);
    
    const content = templateType === 'csv' 
      ? `Instruction,Solution,Category
"Create a function that returns the sum of two numbers","def add(a, b):\n    return a + b","Python Basics"
"Write a function to check if a number is even","def is_even(n):\n    return n % 2 == 0","Python Basics"
"Calculate the mean of a list of numbers","import numpy as np\ndef calculate_mean(numbers):\n    return np.mean(numbers)","Data Analysis"`
      : `Instruction: Create a function that returns the sum of two numbers
Solution: def add(a, b):
    return a + b
Category: Python Basics

Instruction: Write a function to check if a number is even
Solution: def is_even(n):
    return n % 2 == 0
Category: Python Basics`;

    const blob = new Blob([content], { 
      type: templateType === 'csv' ? 'text/csv' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_template.${templateType}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={`p-4 bg-blue-50 border-blue-200 ${className}`}>
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-1">
            Need a template?
          </h4>
          <p className="text-sm text-blue-700">
            Download a sample {templateType.toUpperCase()} file to see the required format.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download {templateType.toUpperCase()} Template
        </Button>
      </div>
    </Card>
  );
};

export default FileUploader;
