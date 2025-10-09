// lib/fileProcessor.ts
import { practiceDatabase } from './database';
import { DataScienceChallenge } from './database';
// FIX 1: Import ParseResult from papaparse
import Papa, { ParseResult } from 'papaparse';

// Types
export interface FileProcessingResult {
    success: boolean;
    message: string;
    totalProcessed: number;
    totalFailed: number;
    categoriesFound: string[];
    errors: string[];
    warnings: string[];
    processingTime: number;
}

export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fileType: 'csv' | 'txt' | 'unknown';
    estimatedCount: number;
}

export interface ParsedChallenge {
    instruction: string;
    solution: string;
    category: string;
    lineNumber: number;
    rawLine: string;
}

// Constants
const SUPPORTED_FORMATS = ['txt', 'csv'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LINE_LENGTH = 10000; // Characters per line

class FileProcessor {
    /**
     * Process a text file containing data science challenges
     */
    async processTxtFile(
        file: File, 
        activityType: string = 'data_science'
    ): Promise<FileProcessingResult> {
        console.log('🔍 [FileProcessor] processTxtFile STARTED', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            activityType
        });

        const startTime = Date.now();
        const result: FileProcessingResult = {
            success: false,
            message: '',
            totalProcessed: 0,
            totalFailed: 0,
            categoriesFound: [],
            errors: [],
            warnings: [],
            processingTime: 0
        };

        try {
            // Validate file
            console.log('🔍 [FileProcessor] Starting file validation');
            const validation = await this.validateFile(file);
            console.log('🔍 [FileProcessor] File validation result:', validation);

            if (!validation.isValid) {
                result.errors = validation.errors;
                result.message = 'File validation failed';
                console.error('❌ [FileProcessor] File validation failed:', validation.errors);
                return result;
            }

            // Read file content
            console.log('🔍 [FileProcessor] Reading file content');
            const content = await this.readFileContent(file);
            console.log('🔍 [FileProcessor] File content length:', content?.length);
            
            if (!content) {
                result.errors.push('Failed to read file content');
                result.message = 'File read error';
                console.error('❌ [FileProcessor] Failed to read file content');
                return result;
            }

            // Log first 500 chars of content for debugging
            console.log('🔍 [FileProcessor] First 500 chars of content:', content.substring(0, 500));

            // Parse based on file type
            let challenges: ParsedChallenge[] = [];
            
            if (validation.fileType === 'csv') {
                console.log('🔍 [FileProcessor] Parsing as CSV file');
                challenges = this.parseCsvContent(content, file.name);
            } else {
                console.log('🔍 [FileProcessor] Parsing as TEXT file');
                challenges = this.parseTextContent(content, file.name);
            }

            console.log('🔍 [FileProcessor] Parsing completed. Challenges found:', challenges.length);

            if (challenges.length === 0) {
                result.errors.push('No valid challenges found in file');
                result.message = 'No challenges processed';
                console.error('❌ [FileProcessor] No challenges found after parsing');
                return result;
            }

            // Log first challenge for debugging
            if (challenges.length > 0) {
                console.log('🔍 [FileProcessor] First challenge sample:', {
                    instruction: challenges[0].instruction?.substring(0, 100),
                    solution: challenges[0].solution?.substring(0, 100),
                    category: challenges[0].category,
                    lineNumber: challenges[0].lineNumber
                });
            }

            // Add warnings for validation issues
            result.warnings.push(...validation.warnings);

            // Process challenges
            console.log('🔍 [FileProcessor] Starting to process challenges');
            const processingResults = await this.processChallenges(challenges, activityType);
            console.log('🔍 [FileProcessor] Challenges processing result:', processingResults);
            
            // Update result
            result.totalProcessed = processingResults.processed;
            result.totalFailed = processingResults.failed;
            result.categoriesFound = processingResults.categories;
            result.errors.push(...processingResults.errors);
            
            // Finalize result
            result.success = processingResults.processed > 0;
            result.message = this.generateResultMessage(result);
            result.processingTime = Date.now() - startTime;

            console.log('✅ [FileProcessor] Final result:', result);
            return result;

        } catch (error) {
            console.error('❌ [FileProcessor] Processing error:', error);
            result.errors.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.message = 'File processing failed';
            result.processingTime = Date.now() - startTime;
            return result;
        }
    }

    /**
     * Validate file before processing
     */
    async validateFile(file: File): Promise<FileValidationResult> {
        console.log('🔍 [FileProcessor] validateFile called', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });

        const result: FileValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            fileType: 'unknown',
            estimatedCount: 0
        };

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            const errorMsg = `File size exceeds limit: ${(file.size / 1024 / 1024).toFixed(2)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB`;
            result.errors.push(errorMsg);
            result.isValid = false;
            console.error('❌ [FileProcessor] File size validation failed:', errorMsg);
        }

        // Check file type
        const fileExtension = file.name.toLowerCase().split('.').pop();
        console.log('🔍 [FileProcessor] File extension:', fileExtension);
        
        if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension as any)) {
            const errorMsg = `Unsupported file type: ${fileExtension}. Supported: ${SUPPORTED_FORMATS.join(', ')}`;
            result.errors.push(errorMsg);
            result.isValid = false;
            console.error('❌ [FileProcessor] File type validation failed:', errorMsg);
        } else {
            result.fileType = fileExtension as 'csv' | 'txt';
            console.log('🔍 [FileProcessor] File type determined as:', result.fileType);
        }

        // Check file name
        if (!file.name || file.name.trim().length === 0) {
            result.warnings.push('File name is empty');
            console.warn('⚠️ [FileProcessor] File name is empty');
        }

        // Estimate challenge count for large files
        if (file.size > 1024 * 1024) {
            const estimatedLines = Math.floor(file.size / 100);
            result.estimatedCount = Math.max(1, Math.floor(estimatedLines / 2));
            result.warnings.push(`Large file detected: ${(file.size / 1024 / 1024).toFixed(2)}MB. Estimated challenges: ${result.estimatedCount}`);
            console.warn('⚠️ [FileProcessor] Large file detected:', result.warnings[result.warnings.length - 1]);
        }

        console.log('🔍 [FileProcessor] Validation result:', result);
        return result;
    }

    /**
     * Read file content with error handling
     */
    private async readFileContent(file: File): Promise<string> {
        console.log('🔍 [FileProcessor] readFileContent called');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;
                    console.log('🔍 [FileProcessor] File read successfully, content length:', content?.length);
                    resolve(content || '');
                } catch (error) {
                    console.error('❌ [FileProcessor] Error processing file content:', error);
                    reject(new Error('Failed to read file content'));
                }
            };
            
            reader.onerror = () => {
                console.error('❌ [FileProcessor] FileReader error occurred');
                reject(new Error('File reading error'));
            };
            
            console.log('🔍 [FileProcessor] Starting file read...');
            reader.readAsText(file, 'UTF-8');
        });
    }

    
    private parseCsvContent(content: string, fileName: string): ParsedChallenge[] {
        console.log('🔍 [FileProcessor] parseCsvContent STARTED');
        const challenges: ParsedChallenge[] = [];
        
        // Define the expected row type
        type CsvRow = Record<string, string>;

        try {
            console.log('🔍 [FileProcessor] Using PapaParse to parse CSV');
            const results = Papa.parse<CsvRow>(content, {
                header: true,
                skipEmptyLines: true,
                delimiter: ',',
                transformHeader: (header: string) => header.trim().toLowerCase().replace(/['"''""]/g, ''),
            }) as ParseResult<CsvRow>;

            console.log('🔍 [FileProcessor] PapaParse results:', {
                dataLength: results.data?.length,
                errors: results.errors,
                meta: results.meta
            });

            const data = results.data; // Now correctly typed as CsvRow[]
            const errors = results.errors; // Now correctly typed as ParseError[]

            if (errors.length > 0) {
                console.warn("⚠️ [FileProcessor] PapaParse detected parsing errors:", errors);
            }

            // Check if we have valid data
            if (!data || data.length === 0) {
                console.warn('❌ [FileProcessor] CSV file contains no data after parsing');
                return challenges;
            }

            // Determine column keys based on normalized headers
            const normalizedKeys = Object.keys(data[0]);
            console.log('🔍 [FileProcessor] Normalized CSV headers:', normalizedKeys);

            const instructionKey = normalizedKeys.find(key => 
                key.includes('instruction') || key.includes('question')
            );
            const solutionKey = normalizedKeys.find(key => 
                key.includes('solution') || key.includes('answer')
            );
            const categoryKey = normalizedKeys.find(key => 
                key.includes('category') || key.includes('topic')
            );

            console.log('🔍 [FileProcessor] Detected columns:', {
                instructionKey,
                solutionKey,
                categoryKey
            });

            // Validate required columns
            if (!instructionKey) {
                console.error('❌ [FileProcessor] CSV File missing required column: Instruction');
                return challenges;
            }
            if (!solutionKey) {
                console.error('❌ [FileProcessor] CSV File missing required column: Solution');
                return challenges;
            }

            // Process the parsed data
            console.log('🔍 [FileProcessor] Processing CSV rows...');
            data.forEach((row, index) => {
                // Get the values using the detected keys
                const instruction = row[instructionKey!]?.trim() || ''; // Added '!'
                const solution = row[solutionKey!]?.trim() || ''; // Added '!'
                // FIX 2: Added non-null assertion '!' to categoryKey to fix TS2538
                const category = (row[categoryKey!]?.trim() || 'General').trim(); 
                
                // Line number accounts for the 0-index and the header row (index + 2)
                const lineNumber = index + 2;

                // Skip empty rows
                if (!instruction && !solution) {
                    if (index < 5) { // Only log first few skips to avoid spam
                        console.log('🔍 [FileProcessor] Skipping empty row:', index);
                    }
                    return;
                }

                try {
                    const challenge: ParsedChallenge = {
                        instruction: this.cleanText(instruction),
                        solution: this.cleanText(solution),
                        category: category || 'General',
                        lineNumber,
                        rawLine: `Row ${index + 1}: ${instruction.substring(0, 50)}...`
                    };

                    // Basic validation
                    if (challenge.instruction && challenge.solution) {
                        challenges.push(challenge);
                        if (challenges.length <= 3) { // Log first 3 challenges for debugging
                            console.log('🔍 [FileProcessor] Added challenge:', {
                                index: challenges.length - 1,
                                instruction: challenge.instruction.substring(0, 50) + '...',
                                solution: challenge.solution.substring(0, 50) + '...',
                                category: challenge.category
                            });
                        }
                    } else {
                        console.warn('⚠️ [FileProcessor] Skipping invalid challenge at row', lineNumber, {
                            hasInstruction: !!challenge.instruction,
                            hasSolution: !!challenge.solution
                        });
                    }

                } catch (error) {
                    console.error(`❌ [FileProcessor] Line ${lineNumber}: Challenge creation error`, error);
                }
            });

            console.log(`✅ [FileProcessor] Successfully parsed ${challenges.length} challenges from CSV`);
            return challenges;

        } catch (error) {
            console.error('❌ [FileProcessor] CSV parsing failed:', error);
            return challenges;
        }
    }

    /**
     * Parse text content (custom format)
     */
    private parseTextContent(content: string, fileName: string): ParsedChallenge[] {
        console.log('🔍 [FileProcessor] parseTextContent STARTED');
        const challenges: ParsedChallenge[] = [];
        const lines = content.split('\n');
        
        console.log('🔍 [FileProcessor] Text file has', lines.length, 'lines');

        let currentChallenge: Partial<ParsedChallenge> = {};
        let lineNumber = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            lineNumber = i + 1;

            try {
                // Skip empty lines
                if (!line) continue;

                // Check for instruction line
                if (line.toLowerCase().startsWith('instruction:') || line.toLowerCase().startsWith('question:')) {
                    // If we have a complete previous challenge, save it
                    if (currentChallenge.instruction && currentChallenge.solution) {
                        const challenge = this.finalizeParsedChallenge(currentChallenge, lineNumber - 1);
                        if (challenge) {
                            challenges.push(challenge);
                            console.log('🔍 [FileProcessor] Text parser added challenge from previous block');
                        }
                    }
                    
                    // Start new challenge
                    currentChallenge = {
                        instruction: line.replace(/^(instruction|question):\s*/i, '').trim(),
                        lineNumber: lineNumber,
                        rawLine: line
                    };
                    console.log('🔍 [FileProcessor] Text parser started new challenge at line', lineNumber);
                }
                // Check for solution line
                else if (line.toLowerCase().startsWith('solution:') || line.toLowerCase().startsWith('answer:')) {
                    if (currentChallenge.instruction) {
                        currentChallenge.solution = line.replace(/^(solution|answer):\s*/i, '').trim();
                        console.log('🔍 [FileProcessor] Text parser found solution at line', lineNumber);
                    }
                }
                // Check for category line
                else if (line.toLowerCase().startsWith('category:') || line.toLowerCase().startsWith('topic:')) {
                    if (currentChallenge.instruction) {
                        currentChallenge.category = line.replace(/^(category|topic):\s*/i, '').trim();
                        console.log('🔍 [FileProcessor] Text parser found category at line', lineNumber);
                    }
                }
                // Continuation of multi-line fields
                else if (currentChallenge.instruction && !currentChallenge.solution) {
                    // Assume this is part of the instruction
                    currentChallenge.instruction += ' ' + line;
                }
                else if (currentChallenge.solution && line.length > 0) {
                    // Assume this is part of the solution (code continuation)
                    currentChallenge.solution += '\n' + line;
                }

            } catch (error) {
                console.error(`❌ [FileProcessor] Line ${lineNumber}: Text parsing error`, error);
            }
        }

        // Don't forget the last challenge
        if (currentChallenge.instruction && currentChallenge.solution) {
            const challenge = this.finalizeParsedChallenge(currentChallenge, lineNumber);
            if (challenge) {
                challenges.push(challenge);
                console.log('🔍 [FileProcessor] Text parser added final challenge');
            }
        }

        console.log(`✅ [FileProcessor] Text parsing completed. Found ${challenges.length} challenges`);
        return challenges;
    }

    /**
     * Finalize a parsed challenge from text format
     */
    private finalizeParsedChallenge(challenge: Partial<ParsedChallenge>, lineNumber: number): ParsedChallenge | null {
        console.log('🔍 [FileProcessor] finalizeParsedChallenge called for line', lineNumber);
        
        try {
            if (!challenge.instruction || !challenge.solution) {
                console.warn('⚠️ [FileProcessor] Challenge missing instruction or solution:', {
                    hasInstruction: !!challenge.instruction,
                    hasSolution: !!challenge.solution
                });
                return null;
            }

            const finalChallenge: ParsedChallenge = {
                instruction: this.cleanText(challenge.instruction),
                solution: this.cleanText(challenge.solution),
                category: this.cleanText(challenge.category || 'General'),
                lineNumber: challenge.lineNumber || lineNumber,
                rawLine: challenge.rawLine || ''
            };

            console.log('🔍 [FileProcessor] Finalized challenge:', {
                instructionLength: finalChallenge.instruction.length,
                solutionLength: finalChallenge.solution.length,
                category: finalChallenge.category
            });

            return finalChallenge;

        } catch (error) {
            console.error(`❌ [FileProcessor] Line ${lineNumber}: Challenge finalization error`, error);
            return null;
        }
    }

    /**
     * Clean and normalize text while preserving code formatting
     */
    private cleanText(text: string): string {
        if (!text) {
            console.log('🔍 [FileProcessor] cleanText received empty text');
            return '';
        }

        console.log('🔍 [FileProcessor] cleanText input length:', text.length);
        const cleaned = text
            .trim()
            // Remove surrounding quotes if they wrap the entire text
            .replace(/^["']([\s\S]*?)["']$/g, '$1')
            // Convert escaped newlines to actual newlines
            .replace(/\\n/g, '\n')
            // Convert escaped tabs to actual tabs
            .replace(/\\t/g, '\t')
            // Preserve all whitespace within the text (don't normalize)
            .trim();

        console.log('🔍 [FileProcessor] cleanText output length:', cleaned.length);
        return cleaned;
    }

    /**
     * Process parsed challenges and save to database
     */
    private async processChallenges(
        challenges: ParsedChallenge[], 
        activityType: string
    ): Promise<{ processed: number; failed: number; categories: string[]; errors: string[] }> {
        console.log('🔍 [FileProcessor] processChallenges STARTED with', challenges.length, 'challenges');

        const result = {
            processed: 0,
            failed: 0,
            categories: [] as string[],
            errors: [] as string[]
        };

        const uniqueCategories = new Set<string>();

        // Clear existing challenges if this is a fresh import
        if (activityType === 'data_science' && challenges.length > 0) {
            console.log('🔍 [FileProcessor] Would clear existing challenges for fresh import');
            // Optional: Clear existing data
            // await practiceDatabase.clearDataScienceChallenges();
        }

        // Process each challenge
        console.log('🔍 [FileProcessor] Starting to save challenges to database...');
        for (const [index, challenge] of challenges.entries()) {
            try {
                // Validate challenge before saving
                const validation = this.validateChallenge(challenge);
                if (!validation.isValid) {
                    result.failed++;
                    result.errors.push(`Line ${challenge.lineNumber}: ${validation.errors.join(', ')}`);
                    console.warn(`⚠️ [FileProcessor] Challenge validation failed at line ${challenge.lineNumber}:`, validation.errors);
                    continue;
                }

                // Save to database
                console.log(`🔍 [FileProcessor] Saving challenge ${index + 1}/${challenges.length} to database`);
                await practiceDatabase.addDataScienceChallenge(
                    challenge.instruction,
                    challenge.solution,
                    challenge.category
                );

                result.processed++;
                uniqueCategories.add(challenge.category);

                if (index < 3) { // Log first 3 saves
                    console.log('✅ [FileProcessor] Successfully saved challenge:', {
                        index: index + 1,
                        category: challenge.category
                    });
                }

            } catch (error) {
                result.failed++;
                const errorMsg = `Line ${challenge.lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                result.errors.push(errorMsg);
                console.error(`❌ [FileProcessor] Failed to save challenge at line ${challenge.lineNumber}:`, error);
            }
        }

        result.categories = Array.from(uniqueCategories).sort();
        
        console.log('✅ [FileProcessor] Database processing completed:', {
            processed: result.processed,
            failed: result.failed,
            categories: result.categories,
            totalErrors: result.errors.length
        });

        return result;
    }

    /**
     * Validate a single challenge
     */
    private validateChallenge(challenge: ParsedChallenge): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check instruction
        if (!challenge.instruction || challenge.instruction.trim().length === 0) {
            errors.push('Instruction is empty');
        } else if (challenge.instruction.length > 1000) {
            errors.push('Instruction too long');
        }

        // Check solution
        if (!challenge.solution || challenge.solution.trim().length === 0) {
            errors.push('Solution is empty');
        } else if (challenge.solution.length > 5000) {
            errors.push('Solution too long');
        }

        // Check category
        if (!challenge.category || challenge.category.trim().length === 0) {
            errors.push('Category is empty');
        } else if (challenge.category.length > 100) {
            errors.push('Category name too long');
        }

        // Check for common issues
        if (challenge.instruction && challenge.instruction === challenge.solution) {
            errors.push('Instruction and solution are identical');
        }

        if (challenge.solution && !challenge.solution.includes('\n') && challenge.solution.length < 10) {
            errors.push('Solution appears too short for code');
        }

        const isValid = errors.length === 0;
        
        if (!isValid) {
            console.log('🔍 [FileProcessor] Challenge validation failed:', {
                lineNumber: challenge.lineNumber,
                errors
            });
        }

        return {
            isValid,
            errors
        };
    }

    /**
     * Generate user-friendly result message
     */
    private generateResultMessage(result: FileProcessingResult): string {
        console.log('🔍 [FileProcessor] generateResultMessage called with:', result);

        if (!result.success) {
            const message = `Processing failed: ${result.errors[0] || 'Unknown error'}`;
            console.log('🔍 [FileProcessor] Generated error message:', message);
            return message;
        }

        const baseMessage = `Successfully processed ${result.totalProcessed} challenge${result.totalProcessed !== 1 ? 's' : ''}`;
        let finalMessage = baseMessage;
        
        if (result.totalFailed > 0) {
            finalMessage = `${baseMessage} (${result.totalFailed} failed)`;
        } else if (result.categoriesFound.length > 0) {
            const categoriesText = result.categoriesFound.length <= 3 
                ? result.categoriesFound.join(', ')
                : `${result.categoriesFound.length} categories`;
            finalMessage = `${baseMessage} from ${categoriesText}`;
        }

        console.log('🔍 [FileProcessor] Generated success message:', finalMessage);
        return finalMessage;
    }

    /**
     * Export challenges to CSV format
     */
    async exportChallengesToCsv(category?: string): Promise<string> {
        console.log('🔍 [FileProcessor] exportChallengesToCsv called for category:', category);
        
        try {
            const challenges = category 
                ? await practiceDatabase.getDataScienceChallengesByCategory(category)
                : await practiceDatabase.getDataScienceChallenges();

            if (challenges.length === 0) {
                console.warn('⚠️ [FileProcessor] No challenges to export');
                throw new Error('No challenges to export');
            }

            console.log(`🔍 [FileProcessor] Exporting ${challenges.length} challenges to CSV`);

            // CSV header
            let csv = 'Instruction,Solution,Category\n';

            // Add each challenge
            for (const challenge of challenges) {
                const escapedInstruction = this.escapeCsv(challenge.instruction);
                const escapedSolution = this.escapeCsv(challenge.solution);
                const escapedCategory = this.escapeCsv(challenge.category);
                
                csv += `"${escapedInstruction}","${escapedSolution}","${escapedCategory}"\n`;
            }

            console.log('✅ [FileProcessor] CSV export completed successfully');
            return csv;
        } catch (error) {
            console.error('❌ [FileProcessor] Export error:', error);
            throw new Error(`Failed to export challenges: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Escape text for CSV
     */
    private escapeCsv(text: string): string {
        if (!text) return '';
        
        // Escape quotes by doubling them
        return text.replace(/"/g, '""');
    }

    /**
     * Get file processing statistics
     */
    async getProcessingStats(): Promise<{
        totalChallenges: number;
        totalCategories: number;
        totalPracticeTime: number;
        lastImportTime?: Date;
    }> {
        console.log('🔍 [FileProcessor] getProcessingStats called');
        
        try {
            const challenges = await practiceDatabase.getDataScienceChallenges();
            const categories = await practiceDatabase.getAllCategories();
            const progress = await practiceDatabase.getUserProgress();

            const stats = {
                totalChallenges: challenges.length,
                totalCategories: categories.length,
                totalPracticeTime: progress.totalPracticeTime,
                lastImportTime: challenges.length > 0 
                    ? new Date(Math.max(...challenges.map(c => new Date(c.updatedAt).getTime())))
                    : undefined
            };

            console.log('✅ [FileProcessor] Stats retrieved:', stats);
            return stats;
        } catch (error) {
            console.error('❌ [FileProcessor] Stats error:', error);
            return {
                totalChallenges: 0,
                totalCategories: 0,
                totalPracticeTime: 0
            };
        }
    }
}

// Create and export a singleton instance
export const fileProcessor = new FileProcessor();

// Convenience exports - ONLY export methods that actually exist
export const processTxtFile = fileProcessor.processTxtFile.bind(fileProcessor);
export const validateFile = fileProcessor.validateFile.bind(fileProcessor);
export const exportChallengesToCsv = fileProcessor.exportChallengesToCsv.bind(fileProcessor);
export const getProcessingStats = fileProcessor.getProcessingStats.bind(fileProcessor);

// Utility function for quick file processing
export const quickProcessFile = async (file: File): Promise<FileProcessingResult> => {
    console.log('🚀 [quickProcessFile] Quick processing started for file:', file.name);
    return fileProcessor.processTxtFile(file, 'data_science');
};

// Template generation
export const generateTemplateFile = (format: 'csv' | 'txt' = 'csv'): string => {
    console.log('🔍 [FileProcessor] Generating template file in format:', format);
    
    if (format === 'csv') {
        return `Instruction,Solution,Category
"Create a function that returns the sum of two numbers","def add(a, b):\n    return a + b","Python Basics"
"Write a function to check if a number is even","def is_even(n):\n    return n % 2 == 0","Python Basics"
"Calculate the mean of a list of numbers","import numpy as np\ndef calculate_mean(numbers):\n    return np.mean(numbers)","Data Analysis"`;
    } else {
        return `Instruction: Create a function that returns the sum of two numbers
Solution: def add(a, b):
    return a + b
Category: Python Basics

Instruction: Write a function to check if a number is even
Solution: def is_even(n):
    return n % 2 == 0
Category: Python Basics

Instruction: Calculate the mean of a list of numbers
Solution: import numpy as np
def calculate_mean(numbers):
    return np.mean(numbers)
Category: Data Analysis`;
    }
};
