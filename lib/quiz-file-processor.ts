// lib/quiz-file-processor.ts
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import Papa from 'papaparse';
import { GoogleSpreadsheet } from 'google-spreadsheet';

// --- INTERFACES ---
export interface QuizQuestion {
	Question: string;
	Answer: string;
	Category: string;
	Type: 'Practical' | 'Theoretical';
}

export interface QuizSubmission {
	registrationCode: string;
	sessionId: string;
	startTime: string;
	endTime: string;
	totalTime: number;
	totalQuestions: number;
	answeredCount: number;
	answers: { [questionIndex: number]: string };
	questions: QuizQuestion[];
	quizNumber: 1 | 2 | 3 | 4;
}

export interface FileProcessingResult {
	success: boolean;
	message: string;
	questions: QuizQuestion[];
	totalProcessed: number;
	errors: string[];
	processingTime: number;
}

export interface GoogleDriveConfig {
	serviceAccountEmail: string;
	privateKey: string;
}

export interface QuizConfig {
	quizNumber: 1 | 2 | 3 | 4;
	csvFileName: string;
	sheetTabName: string;
}

// FIX 2: Update the return type interface to include the 'code' property for specific errors
export interface SubmissionResult {
    success: boolean;
    message: string;
    error?: string;
    code?: 'DUPLICATE_ENTRY' | 'SHEET_NOT_FOUND' | 'UNKNOWN_ERROR';
}

// --- QUIZ FILE PROCESSOR CLASS ---
class QuizFileProcessor {
	private config: GoogleDriveConfig;
	private drive: any;
	
    // FIX 1: Add a definite assignment assertion (!) or initialize it in the constructor
    // Since initializeAuth() is called in the constructor, the assertion is appropriate here.
	private auth!: JWT; // Store the JWT instance for reuse
	private currentQuizNumber: 1 | 2 | 3 | 4;

	constructor(config: GoogleDriveConfig) {
		this.config = config;
		this.currentQuizNumber = this.getCurrentQuizNumberFromEnv();
		this.initializeAuth(); // Initialize Auth first
		this.initializeDrive();
	}

	private initializeAuth() {
		this.auth = new JWT({
			email: this.config.serviceAccountEmail,
			key: this.config.privateKey.replace(/\\n/g, '\n'),
			// Use the broadest scope needed for all operations (Drive & Sheets)
			scopes: [
				'https://www.googleapis.com/auth/drive.readonly',
				'https://www.googleapis.com/auth/drive.file',
				'https://www.googleapis.com/auth/spreadsheets'
			],
		});
	}

	private getCurrentQuizNumberFromEnv(): 1 | 2 | 3 | 4 {
		const envQuizNumber = process.env.NEXT_PUBLIC_QUIZ_NUMBER;

		if (!envQuizNumber) {
			throw new Error('❌ [QuizFileProcessor] Required environment variable NEXT_PUBLIC_QUIZ_NUMBER is not set. Cannot determine quiz to load.');
		}

		const quizNumber = parseInt(envQuizNumber);

		if (![1, 2, 3, 4].includes(quizNumber)) {
			throw new Error(`❌ [QuizFileProcessor] Invalid QUIZ_NUMBER '${envQuizNumber}'. Must be 1, 2, 3, or 4.`);
		}

		return quizNumber as 1 | 2 | 3 | 4;
	}

	private getCurrentQuizConfig(): QuizConfig {
		const quizNumber = this.currentQuizNumber;
		return {
			quizNumber,
			csvFileName: `quiz_questions_${quizNumber}.csv`,
			sheetTabName: `Quiz ${quizNumber}`
		};
	}

	getAvailableQuizzes(): QuizConfig[] {
		return [
			{ quizNumber: 1, csvFileName: 'quiz_questions_1.csv', sheetTabName: 'Quiz 1' },
			{ quizNumber: 2, csvFileName: 'quiz_questions_2.csv', sheetTabName: 'Quiz 2' },
			{ quizNumber: 3, csvFileName: 'quiz_questions_3.csv', sheetTabName: 'Quiz 3' },
			{ quizNumber: 4, csvFileName: 'quiz_questions_4.csv', sheetTabName: 'Quiz 4' }
		];
	}

	private initializeDrive() {
		// Reuse the stored JWT instance
		this.drive = google.drive({ version: 'v3', auth: this.auth });
	}

	async downloadQuizQuestions(): Promise<FileProcessingResult> {
		const quizConfig = this.getCurrentQuizConfig();
		const startTime = Date.now();
		const result: FileProcessingResult = {
			success: false,
			message: '',
			questions: [],
			totalProcessed: 0,
			errors: [],
			processingTime: 0
		};

		try {
			// Validate configuration
			if (!this.config.serviceAccountEmail || !this.config.privateKey) {
				throw new Error('Google Drive configuration incomplete');
			}

			// Search for the CSV file in Google Drive
			const searchResponse = await this.drive.files.list({
				q: `name='${quizConfig.csvFileName}' and mimeType='text/csv' and trashed=false`,
				fields: 'files(id, name)',
			});

			const files = searchResponse.data.files;

			if (!files || files.length === 0) {
				throw new Error(`CSV file '${quizConfig.csvFileName}' not found in Google Drive for Quiz ${quizConfig.quizNumber}. Please upload the file.`);
			}

			const csvFile = files[0];

			// Download the CSV file content
			const fileResponse = await this.drive.files.get({
				fileId: csvFile.id,
				alt: 'media',
			}, { responseType: 'stream' });

			// Convert stream to string
			const csvContent = await this.streamToString(fileResponse.data);

			if (!csvContent) {
				throw new Error('Failed to download CSV file content');
			}

			// Parse CSV content
			const questions = this.parseQuizCsv(csvContent);

			if (questions.length === 0) {
				throw new Error(`No valid questions found in ${quizConfig.csvFileName}. Please check the file format.`);
			}

			result.questions = questions;
			result.totalProcessed = questions.length;
			result.success = true;
			result.message = `Successfully loaded ${questions.length} quiz questions for Quiz ${quizConfig.quizNumber}`;
			result.processingTime = Date.now() - startTime;

		} catch (error) {
			result.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			result.processingTime = Date.now() - startTime;
		}

		return result;
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

	/**
	 * Parse CSV content into QuizQuestion objects
	 */
	private parseQuizCsv(csvContent: string): QuizQuestion[] {

		const questions: QuizQuestion[] = [];

		try {
			const results = Papa.parse(csvContent, {
				header: true,
				skipEmptyLines: true,
				transformHeader: (header: string) => {
					// Normalize header names
					const normalized = header.trim().toLowerCase();
					if (normalized.includes('question')) return 'Question';
					if (normalized.includes('answer') || normalized.includes('solution')) return 'Answer';
					if (normalized.includes('category') || normalized.includes('topic')) return 'Category';
					if (normalized.includes('type')) return 'Type';
					return header;
				}
			});

			const data = results.data as any[];

			if (!data || data.length === 0) {
				return questions;
			}

			for (const row of data) {
				try {
					const question: QuizQuestion = {
						Question: (row.Question || '').trim(),
						Answer: (row.Answer || '').trim(),
						Category: (row.Category || 'General').trim(),
						Type: this.normalizeQuestionType(row.Type)
					};

					// Validate required fields
					if (question.Question && question.Answer) {
						questions.push(question);
					}
				} catch (error) {
					// error handling
				}
			}
		} catch (error) {
			// error handling
		}

		return questions;
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


	async submitQuizResults(submission: QuizSubmission, spreadsheetId: string): Promise<SubmissionResult> {
		const quizConfig = this.getCurrentQuizConfig();
		const resultsSheetName = quizConfig.sheetTabName;
		const incomingCode = submission.registrationCode.trim().toLowerCase();

		try {
			// --- 1. CLIENT SETUP
			const sheets = google.sheets({ version: 'v4', auth: this.auth });

			// --- 2. SINGLE SUBMISSION CHECK (USING googleapis) ---
			// Range: Read column A (registrationCode) from row 1 down (includes header)
			const columnRange = `${resultsSheetName}!A:A`;

			const response = await sheets.spreadsheets.values.get({
				spreadsheetId,
				range: columnRange,
			});

			const existingCodes = response.data.values || [];

			let duplicateRowIndex = -1;

			const isDuplicate = existingCodes.some((rowArray, index) => {
				// index 0 is the header. We start checking data from index 1 (row 2)
				if (index === 0) return false;

				const sheetCode = rowArray[0]; // Value from Column A is at index 0
				const rowIndex = index + 1; // Actual sheet row number

				// Skip empty or invalid values
				if (!sheetCode) {
					return false;
				}

				const normalizedSheetCode = String(sheetCode).trim().toLowerCase();
				const isMatch = normalizedSheetCode === incomingCode;

				
				if (isMatch) {
					duplicateRowIndex = rowIndex;
				}
				return isMatch;
			});

			if (isDuplicate) {
				const errorMessage = `Registration code '${submission.registrationCode}' has already submitted results for Quiz ${quizConfig.quizNumber}. Duplicate found in sheet row ${duplicateRowIndex}. Submission rejected.`;
				return {
					success: false,
					message: 'Duplicate submission rejected.',
					error: `Results already exist for registration code: ${submission.registrationCode}`,
					// FIX 2: The 'code' property now exists in the SubmissionResult interface
					code: 'DUPLICATE_ENTRY' 
				};
			}

			// --- 3. SUBMISSION (USING google-spreadsheet) ---
			const doc = new GoogleSpreadsheet(spreadsheetId, this.auth);
			await doc.loadInfo();
			let sheet = doc.sheetsByTitle[resultsSheetName];

			if (!sheet) {
				const errorMessage = `Sheet '${resultsSheetName}' not found... Submission aborted.`;
				console.error(`❌ [QuizFileProcessor] ${errorMessage}`);
				return { 
                    success: false, 
                    message: `Failed to submit quiz results: Sheet not found.`, 
                    error: errorMessage,
                    code: 'SHEET_NOT_FOUND' // Added specific error code
                };
			}

			// This is necessary for addRow() to work correctly
			await sheet.loadHeaderRow();

			// Prepare row data (using descriptive headers)
			const rowData = {
				registrationCode: submission.registrationCode,
				sessionId: submission.sessionId,
				startTime: submission.startTime,
				endTime: submission.endTime,
				totalTimeSeconds: submission.totalTime,
				totalQuestions: submission.totalQuestions,
				answeredCount: submission.answeredCount,
				completionRate: ((submission.answeredCount / submission.totalQuestions) * 100).toFixed(2),
				submissionTime: new Date().toISOString(),
				answersJson: JSON.stringify(submission.answers)
			};

			// Add the row
			await sheet.addRow(rowData);

			return {
				success: true,
				message: `Quiz ${quizConfig.quizNumber} results submitted to Google Sheets`
			};

		} catch (error) {
			console.error(`❌ [QuizFileProcessor] Error submitting Quiz ${quizConfig.quizNumber} results:`, error);
			return {
				success: false,
				message: `Failed to submit Quiz ${quizConfig.quizNumber} results`,
				error: error instanceof Error ? error.message : 'Unknown error',
                code: 'UNKNOWN_ERROR' // Added specific error code
			};
		}
	}

	getCurrentQuizNumber(): 1 | 2 | 3 | 4 {
		return this.currentQuizNumber;
	}
}

// Create singleton instance with environment configuration
export const quizFileProcessor = new QuizFileProcessor({
	serviceAccountEmail: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL || '',
	privateKey: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY || ''
});

// Utility function to check if Google Drive is configured
export const isGoogleDriveConfigured = (): boolean => {
	const isConfigured = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL && process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY);
	return isConfigured;
};

// Utility function to check if Google Sheets is configured
export const isGoogleSheetsConfigured = (): boolean => {
	const isConfigured = !!(process.env.NEXT_PUBLIC_GOOGLE_TEST_SHEET_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL && process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY);
	return isConfigured;
};

// Utility function to get current quiz number
export const getCurrentQuizNumber = (): 1 | 2 | 3 | 4 => {
	return quizFileProcessor.getCurrentQuizNumber();
};
