// lib/quiz-file-processor.ts
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import Papa from 'papaparse';
import { GoogleSpreadsheet } from 'google-spreadsheet'; 

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

class QuizFileProcessor {
  private config: GoogleDriveConfig;
  private drive: any;
  private currentQuizNumber: 1 | 2 | 3 | 4;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
    this.currentQuizNumber = this.getCurrentQuizNumberFromEnv();
    this.initializeDrive();
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

   console.log(`🔍 [QuizFileProcessor] Using Quiz ${quizNumber} configuration`);
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
    const auth = new JWT({
      email: this.config.serviceAccountEmail,
      key: this.config.privateKey.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    this.drive = google.drive({ version: 'v3', auth });
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
      console.log(`🔍 [QuizFileProcessor] Starting Quiz ${quizConfig.quizNumber} questions download from: ${quizConfig.csvFileName}`);

      // Validate configuration
      if (!this.config.serviceAccountEmail || !this.config.privateKey) {
        throw new Error('Google Drive configuration incomplete');
      }

      // Search for the CSV file in Google Drive
      console.log(`🔍 [QuizFileProcessor] Searching for CSV file: ${quizConfig.csvFileName}`);
      const searchResponse = await this.drive.files.list({
        q: `name='${quizConfig.csvFileName}' and mimeType='text/csv' and trashed=false`,
        fields: 'files(id, name)',
      });

      const files = searchResponse.data.files;
      
      if (!files || files.length === 0) {
        throw new Error(`CSV file '${quizConfig.csvFileName}' not found in Google Drive for Quiz ${quizConfig.quizNumber}. Please upload the file.`);
      }

      const csvFile = files[0];
      console.log(`✅ [QuizFileProcessor] Found CSV file for Quiz ${quizConfig.quizNumber}: ${csvFile.name} (ID: ${csvFile.id})`);

      // Download the CSV file content
      console.log('🔍 [QuizFileProcessor] Downloading CSV file content...');
      const fileResponse = await this.drive.files.get({
        fileId: csvFile.id,
        alt: 'media',
      }, { responseType: 'stream' });

      // Convert stream to string
      const csvContent = await this.streamToString(fileResponse.data);
      
      if (!csvContent) {
        throw new Error('Failed to download CSV file content');
      }

      console.log(`📄 [QuizFileProcessor] Downloaded CSV content (${csvContent.length} characters)`);

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

      console.log(`✅ [QuizFileProcessor] Quiz ${quizConfig.quizNumber} questions download completed:`, result);

    } catch (error) {
      console.error(`❌ [QuizFileProcessor] Error downloading Quiz ${quizConfig.quizNumber} questions:`, error);
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
    console.log('🔍 [QuizFileProcessor] Parsing CSV content');
    
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

      console.log('📊 [QuizFileProcessor] PapaParse results:', {
        dataLength: results.data?.length,
        errors: results.errors,
        meta: results.meta
      });

      if (results.errors.length > 0) {
        console.error('❌ [QuizFileProcessor] CSV parsing errors:', results.errors);
      }

      const data = results.data as any[];

      if (!data || data.length === 0) {
        console.error('❌ [QuizFileProcessor] No data found after CSV parsing');
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
          } else {
            console.warn('⚠️ [QuizFileProcessor] Skipping invalid row - missing Question or Answer:', {
              hasQuestion: !!question.Question,
              hasAnswer: !!question.Answer,
              row
            });
          }
        } catch (error) {
          console.error('❌ [QuizFileProcessor] Error parsing row:', error, row);
        }
      }

      console.log(`✅ [QuizFileProcessor] Parsed ${questions.length} valid questions`);
    } catch (error) {
      console.error('❌ [QuizFileProcessor] CSV parsing failed:', error);
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

  /**
   * Submit quiz results to Google Sheets
   * Uses environment variable QUIZ_NUMBER to determine which tab to use
   */
  async submitQuizResults(submission: QuizSubmission, spreadsheetId: string): Promise<{ success: boolean; message: string; error?: string }> {
    const quizConfig = this.getCurrentQuizConfig();
    console.log(`🔍 [QuizFileProcessor] Starting Quiz ${quizConfig.quizNumber} results submission to Google Sheets`);

    try {
      
      const auth = new JWT({
        email: this.config.serviceAccountEmail,
        key: this.config.privateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const doc = new GoogleSpreadsheet(spreadsheetId, auth);
      await doc.loadInfo();
      
      console.log(`📊 [QuizFileProcessor] Loaded document for Quiz ${quizConfig.quizNumber}:`, doc.title);

      // Look for the specific quiz results sheet
      const resultsSheetName = quizConfig.sheetTabName;
      let sheet = doc.sheetsByTitle[resultsSheetName];
      
      // Check for sheet existence and FAIL if not found
      if (!sheet) {
        const errorMessage = `Sheet '${resultsSheetName}' not found in spreadsheet ID ${spreadsheetId} for Quiz ${quizConfig.quizNumber}. Submission aborted.`;
        console.error(`❌ [QuizFileProcessor] ${errorMessage}`);
        return {
            success: false,
            message: `Failed to submit quiz results: Sheet for Quiz ${quizConfig.quizNumber} not found.`,
            error: errorMessage
        };
      }

      await sheet.loadHeaderRow();
      console.log(`📋 [QuizFileProcessor] Sheet headers for ${resultsSheetName}:`, sheet.headerValues);

      // Prepare row data
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

      console.log(`📝 [QuizFileProcessor] Adding submission row to ${resultsSheetName}:`, rowData);

      // Add the row
      await sheet.addRow(rowData);

      console.log(`✅ [QuizFileProcessor] Quiz ${quizConfig.quizNumber} results submitted successfully to ${resultsSheetName}`);
      
      return {
        success: true,
        message: `Quiz ${quizConfig.quizNumber} results submitted to Google Sheets`
      };

    } catch (error) {
      console.error(`❌ [QuizFileProcessor] Error submitting Quiz ${quizConfig.quizNumber} results:`, error);
      return {
        success: false,
        message: `Failed to submit Quiz ${quizConfig.quizNumber} results`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current quiz number from environment
   */
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
  
  //console.log('🔍 [QuizFileProcessor] NEXT_GOOGLE_CLIENT_EMAIL:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL);
  //console.log('🔍 [QuizFileProcessor] NEXT_GOOGLE_PRIVATE_KEY:', process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY);
  
  
  console.log('🔍 [QuizFileProcessor] Google Drive configured:', isConfigured);
  return isConfigured;
};

// Utility function to check if Google Sheets is configured
export const isGoogleSheetsConfigured = (): boolean => {
  const isConfigured = !!(process.env.NEXT_PUBLIC_GOOGLE_TEST_SHEET_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL && process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY);
  
  //console.log('🔍 [QuizFileProcessor] NEXT_GOOGLE_CLIENT_EMAIL:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL);
  //console.log('🔍 [QuizFileProcessor] NEXT_GOOGLE_PRIVATE_KEY:', process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY);
  //console.log('🔍 [QuizFileProcessor] NEXT_GOOGLE_TEST_SHEET_ID:', process.env.NEXT_PUBLIC_GOOGLE_TEST_SHEET_ID);
  
  
  
  console.log('🔍 [QuizFileProcessor] Google Sheets configured:', isConfigured);
  return isConfigured;
};

// Utility function to get current quiz number
export const getCurrentQuizNumber = (): 1 | 2 | 3 | 4 => {
  return quizFileProcessor.getCurrentQuizNumber();
};
