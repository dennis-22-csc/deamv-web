// lib/practice-file-processor.ts
import { practiceDatabase } from '@/lib/database';

// Types
export interface PracticeQuestion {
    Question: string;
    Answer: string;
    Category: string;
    Type: 'Practical' | 'Theoretical';
}

export interface FileProcessingResult {
    success: boolean;
    message: string;
    totalProcessed: number;
    totalFailed: number;
    categoriesFound: string[];
    errors: string[];
    warnings: string[];
    processingTime: number;
    questions: PracticeQuestion[];
}

// Server-side only class
class PracticeFileProcessor {
    
    // Define the environment variable for the folder ID
    private readonly PRACTICE_FOLDER_ID = process.env.NEXT_PUBLIC_DEAMV_FOLDER_ID;

    /**
     * Search for all practice files in a specific Google Drive folder.
     */
    private async searchPracticeFiles(drive: any): Promise<any[]> {
        console.log('🔍 [PracticeFileProcessor] Starting practice file search...');

        // Check if the folder ID is set
        if (!this.PRACTICE_FOLDER_ID) {
            console.warn('⚠️ [PracticeFileProcessor] GOOGLE_PRACTICE_FOLDER_ID is NOT set. Performing broad search.');
        }

        // Base query for file location: restricts search to the specified folder ID if available.
        const FOLDER_QUERY = this.PRACTICE_FOLDER_ID 
            ? `'${this.PRACTICE_FOLDER_ID}' in parents and` 
            : ''; 

        try {
            // --- MODIFICATION: Diagnostic Search to print ALL CSV files in the target folder ---
            //console.log('⚠️ [PracticeFileProcessor] Running diagnostic search for ALL CSV files in the accessible folder(s)...');
            const diagnosticResponse = await drive.files.list({
                // Query now includes the FOLDER_QUERY
                q: `${FOLDER_QUERY} mimeType='text/csv' and trashed=false`,
                fields: 'files(id, name, parents)', // Include 'parents' to check folder location
                pageSize: 1000, 
                orderBy: 'name',
            });

            const allFiles = diagnosticResponse.data.files || [];
            
            /*console.log(`❌ [PracticeFileProcessor] DIAGNOSTIC: Found ${allFiles.length} accessible CSV files (name/id/parent):`);
            allFiles.forEach((f: any) => 
                console.log(`    - ${f.name} (${f.id}) - Parents: ${f.parents ? f.parents.join(', ') : 'Root'}`)
            );*/
            // --- END OF MODIFICATION: Diagnostic Search ---

            // The original search query to find candidates, now restricted by folder
            const searchResponse = await drive.files.list({
                // Query now includes the FOLDER_QUERY
                q: `${FOLDER_QUERY} (name contains 'class' or name contains 'hands_on') and mimeType='text/csv' and trashed=false`,
                fields: 'files(id, name, size, createdTime)',
                pageSize: 100,
                orderBy: 'name',
            });

            const rawFiles = searchResponse.data.files || [];

            console.log(`🔍 [PracticeFileProcessor] Raw search results (${rawFiles.length} files):`,
                rawFiles.map((f: any) => `${f.name} (${f.id})`));

            // ... (rest of the original filtering and logic remains the same) ...

            const practiceFileRegex = /^(class\d+)/i;

            let filteredFiles = rawFiles.filter((file: any) =>
                practiceFileRegex.test(file.name)
            );

            console.log(`✅ [PracticeFileProcessor] Filtered files based on 'classN' start (${filteredFiles.length} files):`,
                filteredFiles.map((f: any) => f.name));

            let files = filteredFiles;

            if (files.length < 2) {
                console.log('🔍 [PracticeFileProcessor] Fewer files than expected, running diagnostic searches...');
                
                const individualSearches = [];
                for (let i = 1; i <= 10; i++) {
                    individualSearches.push(
                        drive.files.list({
                            // Individual search queries are also now restricted by folder
                            q: `${FOLDER_QUERY} name = 'class${i}_hands_on.csv' and mimeType='text/csv' and trashed=false`,
                            fields: 'files(id, name, size, createdTime)',
                        })
                    );
                }

                const individualResults = await Promise.all(individualSearches);
                const individualFiles = individualResults.flatMap(result => result.data.files || []);

                console.log(`🔍 [PracticeFileProcessor] Individual file search found:`,
                    individualFiles.map((f: any) => f.name));

                const allFilesMap = new Map<string, any>();

                files.forEach((file: any) => allFilesMap.set(file.id, file));
                individualFiles.forEach((file: any) => allFilesMap.set(file.id, file));

                const combinedFiles = Array.from(allFilesMap.values());
                console.log(`✅ [PracticeFileProcessor] Combined results: ${combinedFiles.length} files`);

                return combinedFiles;
            }

            return files;

        } catch (error) {
            console.error('❌ [PracticeFileProcessor] Search error:', error);
            throw error;
        }
    }
    
    // ... (downloadAllPracticeQuestions and other methods remain the same) ...

    /**
     * Download and process all practice files from Google Drive
     * This should only be called from server-side code (API routes)
     */
    async downloadAllPracticeQuestions(
        onProgress?: (progress: number) => void
    ): Promise<FileProcessingResult> {
        // Dynamic import for server-side only modules
        const { google } = await import('googleapis');
        const { JWT } = await import('google-auth-library');
        
        const startTime = Date.now();
        const result: FileProcessingResult = {
            success: false,
            message: '',
            questions: [],
            totalProcessed: 0,
            totalFailed: 0,
            categoriesFound: [],
            errors: [],
            warnings: [],
            processingTime: 0,
        };

        try {
            console.log('🔍 [PracticeFileProcessor] Starting practice questions download from Google Drive');

            // Check configuration
            const serviceAccountEmail = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL;
            const privateKey = process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY;
            
            if (!serviceAccountEmail || !privateKey) {
                throw new Error('Google Drive service account configuration missing. Check environment variables.');
            }

            // Initialize Google Drive
            const auth = new JWT({
                email: serviceAccountEmail,
                key: privateKey.replace(/\\n/g, '\n'),
                scopes: [
                    'https://www.googleapis.com/auth/drive.readonly',
                ],
            });

            const drive = google.drive({ version: 'v3', auth });

            if (onProgress) {
                onProgress(10);
            }

            // --- Use the new search function ---
            const files = await this.searchPracticeFiles(drive);
            // -----------------------------------
            
            if (!files || files.length === 0) {
                // Modified error message to reflect the folder restriction
                const folderInfo = this.PRACTICE_FOLDER_ID 
                    ? `in the specified folder ID: ${this.PRACTICE_FOLDER_ID}` 
                    : 'in Google Drive';
                throw new Error(`No practice files found ${folderInfo}. Expected files: class1_hands_on.csv, etc.`);
            }

            console.log(`✅ [PracticeFileProcessor] Found ${files.length} practice files:`, files.map((f: any) => f.name));

            const allQuestions: PracticeQuestion[] = [];
            const categories = new Set<string>();

            // Process each file sequentially
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`🔍 [PracticeFileProcessor] Processing file ${i + 1}/${files.length}: ${file.name}`);
                
                if (onProgress) {
                    onProgress(10 + Math.floor((i / files.length) * 70));
                }

                try {
                    // Download and process file
                    const fileQuestions = await this.downloadAndProcessFile(drive, file);
                    allQuestions.push(...fileQuestions);
                    
                    // Extract categories from questions
                    fileQuestions.forEach(q => {
                        if (q.Category) {
                            categories.add(q.Category);
                        }
                    });

                    console.log(`✅ [PracticeFileProcessor] Processed ${file.name}: ${fileQuestions.length} questions`);

                } catch (error) {
                    const errorMsg = `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    console.error(`❌ [PracticeFileProcessor] ${errorMsg}`);
                    result.errors.push(errorMsg);
                }
            }

            if (onProgress) {
                onProgress(80);
            }

            if (allQuestions.length === 0) {
                throw new Error('No valid questions found in any practice files');
            }

            // Update result with parsed questions
            result.questions = allQuestions;
            result.totalProcessed = allQuestions.length;    
            result.totalFailed = 0;    
            result.categoriesFound = Array.from(categories);
            result.success = true;
            result.message = this.generateResultMessage(result);
            result.processingTime = Date.now() - startTime;

            console.log(`✅ [PracticeFileProcessor] Practice questions parsing completed:`, {
                success: result.success,
                questions: result.questions.length,
                categories: result.categoriesFound,
                processingTime: result.processingTime
            });

        } catch (error) {
            console.error('❌ [PracticeFileProcessor] Error downloading practice questions:', error);
            result.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.processingTime = Date.now() - startTime;
        }

        if (onProgress) {
            onProgress(100);
        }
        return result;
    }

    /**
     * Download and process a single file
     */
    private async downloadAndProcessFile(drive: any, file: any): Promise<PracticeQuestion[]> {
        console.log(`🔍 [PracticeFileProcessor] Downloading file: ${file.name} (ID: ${file.id})`);

        // Download the CSV file content
        const fileResponse = await drive.files.get({
            fileId: file.id,
            alt: 'media',
        }, { responseType: 'stream' });

        // Convert stream to string
        const csvContent = await this.streamToString(fileResponse.data);
        
        if (!csvContent) {
            throw new Error('Failed to download file content');
        }

        console.log(`📄 [PracticeFileProcessor] Downloaded ${file.name} content (${csvContent.length} characters)`);

        // Parse CSV content using enhanced parser
        return this.parseCsvContent(csvContent, file.name);
    }

    /**
     * Enhanced CSV parsing based on local file processor logic
     */
    private parseCsvContent(content: string, fileName: string): PracticeQuestion[] {
        console.log('🔍 [PracticeFileProcessor] parseCsvContent STARTED');
        const questions: PracticeQuestion[] = [];
        
        try {
            // Use the same parsing logic as fileProcessor.ts
            const lines = content.split('\n');
            
            // Skip empty files
            if (lines.length <= 1) {
                console.warn('❌ [PracticeFileProcessor] CSV file is empty or has only headers');
                return questions;
            }

            // Parse header row to detect column mapping
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            console.log('🔍 [PracticeFileProcessor] CSV headers:', headers);

            // Detect column indices
            const instructionIndex = headers.findIndex(h => 
                h.includes('instruction') || h.includes('question')
            );
            const solutionIndex = headers.findIndex(h => 
                h.includes('solution') || h.includes('answer')
            );
            const categoryIndex = headers.findIndex(h => 
                h.includes('category') || h.includes('topic')
            );
            const typeIndex = headers.findIndex(h => 
                h.includes('type')
            );

            console.log('🔍 [PracticeFileProcessor] Detected column indices:', {
                instructionIndex,
                solutionIndex,
                categoryIndex,
                typeIndex
            });

            // Validate required columns
            if (instructionIndex === -1 || solutionIndex === -1) {
                console.error('❌ [PracticeFileProcessor] CSV missing required columns: Instruction and Solution');
                return questions;
            }

            // Process data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const columns = this.parseCsvLine(line);
                
                // Skip rows that don't have enough columns
                if (columns.length <= Math.max(instructionIndex, solutionIndex)) {
                    console.warn(`⚠️ [PracticeFileProcessor] Skipping row ${i}: insufficient columns`);
                    continue;
                }

                const instruction = columns[instructionIndex]?.trim() || '';
                const solution = columns[solutionIndex]?.trim() || '';
                const category = (categoryIndex !== -1 ? columns[categoryIndex]?.trim() : 'General') || 'General';
                const type = (typeIndex !== -1 ? columns[typeIndex]?.trim() : '') || '';

                // Skip empty rows
                if (!instruction && !solution) {
                    continue;
                }

                try {
                    const question: PracticeQuestion = {
                        Question: this.cleanText(instruction),
                        Answer: this.cleanText(solution),
                        Category: category,
                        Type: this.normalizeQuestionType(type)
                    };

                    // Enhanced validation
                    const validation = this.validateQuestion(question, i + 1);
                    if (!validation.isValid) {
                        console.warn(`⚠️ [PracticeFileProcessor] Skipping invalid question at row ${i + 1}:`, validation.errors);
                        continue;
                    }

                    questions.push(question);
                    
                    if (questions.length <= 3) { // Log first 3 questions for debugging
                        console.log('🔍 [PracticeFileProcessor] Added question:', {
                            index: questions.length - 1,
                            question: question.Question.substring(0, 50) + '...',
                            answer: question.Answer.substring(0, 50) + '...',
                            category: question.Category,
                            type: question.Type
                        });
                    }

                } catch (error) {
                    console.error(`❌ [PracticeFileProcessor] Row ${i + 1}: Question creation error`, error);
                }
            }

            console.log(`✅ [PracticeFileProcessor] Successfully parsed ${questions.length} questions from CSV`);
            return questions;

        } catch (error) {
            console.error('❌ [PracticeFileProcessor] CSV parsing failed:', error);
            return questions;
        }
    }

    /**
     * Parse CSV line with proper quote handling
     */
    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                // If the next character is also the quoteChar, it's an escaped quote
                if (line[i + 1] === quoteChar) {
                    current += quoteChar;
                    i++; // Skip the next quote
                } else {
                    inQuotes = false;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        result.push(current);
        return result.map(field => field.trim());
    }

    /**
     * Enhanced text cleaning from local file processor
     */
    private cleanText(text: string): string {
        if (!text) {
            return '';
        }

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

        return cleaned;
    }

    /**
     * Enhanced question validation from local file processor
     */
    private validateQuestion(question: PracticeQuestion, lineNumber: number): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check instruction
        if (!question.Question || question.Question.trim().length === 0) {
            errors.push('Instruction is empty');
        } else if (question.Question.length > 1000) {
            errors.push('Instruction too long');
        }

        // Check solution
        if (!question.Answer || question.Answer.trim().length === 0) {
            errors.push('Solution is empty');
        } else if (question.Answer.length > 5000) {
            errors.push('Solution too long');
        }

        // Check category
        if (!question.Category || question.Category.trim().length === 0) {
            errors.push('Category is empty');
        } else if (question.Category.length > 100) {
            errors.push('Category name too long');
        }

        // Check for common issues
        if (question.Question && question.Question === question.Answer) {
            errors.push('Instruction and solution are identical');
        }

        const isValid = errors.length === 0;
        
        if (!isValid) {
            console.log('🔍 [PracticeFileProcessor] Question validation failed:', {
                lineNumber,
                errors
            });
        }

        return {
            isValid,
            errors
        };
    }

    /**
     * Normalize question type to Practical/Theoretical
     */
    private normalizeQuestionType(type: string): 'Practical' | 'Theoretical' {
        if (!type) return 'Theoretical'; // Default to Theoretical
        
        const normalized = type.trim().toLowerCase();
        if (normalized.includes('practical') || normalized.includes('coding') || normalized.includes('code')) {
            return 'Practical';
        }
        return 'Theoretical';
    }

    /**
     * Generate user-friendly result message
     */
    private generateResultMessage(result: FileProcessingResult): string {
        console.log('🔍 [PracticeFileProcessor] generateResultMessage called with:', result);

        if (!result.success) {
            const message = `Processing failed: ${result.errors[0] || 'Unknown error'}`;
            console.log('🔍 [PracticeFileProcessor] Generated error message:', message);
            return message;
        }

        const baseMessage = `Successfully parsed ${result.questions.length} question${result.questions.length !== 1 ? 's' : ''}`;
        let finalMessage = baseMessage;
        
        if (result.categoriesFound.length > 0) {
            const categoriesText = result.categoriesFound.length <= 3 
                ? result.categoriesFound.join(', ')
                : `${result.categoriesFound.length} categories`;
            finalMessage = `${baseMessage} from ${categoriesText}`;
        }

        console.log('🔍 [PracticeFileProcessor] Generated success message:', finalMessage);
        return finalMessage;
    }

    /**
     * Convert stream to string
     */
    private streamToString(stream: any): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            stream.on('error', reject);
        });
    }
}

// Create singleton instance
export const practiceFileProcessor = new PracticeFileProcessor();

// Utility function to check if Google Drive is configured (server-side only)
export const isGoogleDriveConfigured = (): boolean => {
    return !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL && process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY);
};
