// app/api/evaluate-answer/route.ts
import { NextResponse, NextRequest } from 'next/server';

// Types
export interface EvaluationRequest {
  instruction: string;
  userCode: string;
  expectedSolution: string;
  language?: string;
  context?: string;
  apiKey?: string;
}

export interface EvaluationResponse {
  success: boolean;
  feedback: string;
  isCorrect: boolean;
  score?: number;
  suggestions?: string[];
  errors?: string[];
  confidence?: number;
}

export interface GeminiConfig {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Default configuration
const DEFAULT_CONFIG: GeminiConfig = {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.2,
  maxOutputTokens: 1024,
  topK: 40,
  topP: 0.95,
};

class GeminiAPI {
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';
  private apiKey: string | null = null;
  private config: GeminiConfig = DEFAULT_CONFIG;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setConfig(config: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async evaluateCode(request: Omit<EvaluationRequest, 'apiKey'>): Promise<EvaluationResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured');
      }

      const prompt = this.buildEvaluationPrompt(request);
      const response = await this.makeRequest(prompt);

      return this.parseEvaluationResponse(response, request);
    } catch (error) {
      // Propagate the configuration error or the specific ApiError from makeRequest
      if (error instanceof Error && error.message.includes('API key not configured')) {
        throw error;
      }

      // If it's an API error (e.g., 401 for invalid key), throw it to be caught by the route handler's main catch block
      if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
          throw error;
      }

      return this.handleError(error);
    }
  }

  private async makeRequest(prompt: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key not available');
    }

    const response = await fetch(`${this.baseURL}/models/${this.config.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: this.config.maxOutputTokens,
          temperature: this.config.temperature,
          topK: this.config.topK,
          topP: this.config.topP,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      // Throw the ApiError object which the route handler can easily process
      throw this.handleApiError(response.status, errorData);
    }

    return await response.json();
  }

  
  private buildEvaluationPrompt(request: Omit<EvaluationRequest, 'apiKey'>): string {
    const { instruction, userCode, expectedSolution, language = 'python', context } = request;

    return `
You are an expert Python programming instructor evaluating a student's code submission for a data science exercise.

CONTEXT:
${context || 'This is a data science practice exercise focusing on Python programming.'}

EXERCISE INSTRUCTION:
${instruction}

EXPECTED SOLUTION APPROACH:
${expectedSolution}

STUDENT'S CODE SUBMISSION:
\`\`\`${language}
${userCode}
\`\`\`

EVALUATION CRITERIA:
1. Functional Correctness: Does the code solve the problem correctly?
2. Code Quality: Is the code readable, efficient, and well-structured?
3. Best Practices: Does it follow Python conventions and data science best practices?
4. Error Handling: Does it handle edge cases appropriately?

EVALUATION INSTRUCTIONS:
- Analyze the student's code thoroughly
- Check if it produces the expected output/behavior
- Provide specific, constructive feedback
- Focus on learning and improvement
- Be encouraging but honest
- If the code is incorrect, explain why and suggest improvements
- If the code is correct but could be better, suggest optimizations
- Keep feedback concise but comprehensive (3-5 sentences maximum)
- Use second person ("You", "Your") in feedback
- End your response with exactly one of these verdicts:
  VERDICT: CORRECT
  VERDICT: INCORRECT
  VERDICT: PARTIAL

IMPORTANT: The student's solution doesn't need to match the expected solution exactly. It just needs to be functionally correct and achieve the same result.

Provide your evaluation:
`.trim();
  }

  
  private parseEvaluationResponse(apiResponse: any, request: Omit<EvaluationRequest, 'apiKey'>): EvaluationResponse {
    try {
      const text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response text from API');
      }

      // Extract verdict
      const verdictMatch = text.match(/VERDICT:\s*(CORRECT|INCORRECT|PARTIAL)/i);
      const verdict = verdictMatch ? verdictMatch[1].toUpperCase() as 'CORRECT' | 'INCORRECT' | 'PARTIAL' : 'INCORRECT';

      // Clean feedback text (remove verdict line)
      const feedback = text.replace(/VERDICT:\s*(CORRECT|INCORRECT|PARTIAL)/i, '').trim();

      // Calculate confidence score based on response characteristics
      const confidence = this.calculateConfidence(feedback, verdict);

      // Generate suggestions
      const suggestions = this.extractSuggestions(feedback);

      return {
        success: true,
        feedback,
        isCorrect: verdict === 'CORRECT',
        score: verdict === 'CORRECT' ? 100 : verdict === 'PARTIAL' ? 70 : 0,
        suggestions,
        confidence,
      };
    } catch (error) {
      console.error('Error parsing evaluation response:', error);
      return {
        success: false,
        feedback: 'Unable to parse AI response. Please try again.',
        isCorrect: false,
        errors: ['Response parsing failed'],
      };
    }
  }

  
  private calculateConfidence(feedback: string, verdict: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for longer, detailed feedback
    if (feedback.length > 100) confidence += 0.1;
    if (feedback.length > 200) confidence += 0.1;

    // Increase confidence for specific technical terms
    const technicalTerms = ['function', 'variable', 'loop', 'import', 'pandas', 'numpy', 'dataframe'];
    const foundTerms = technicalTerms.filter(term => feedback.toLowerCase().includes(term));
    confidence += foundTerms.length * 0.05;

    // Adjust based on verdict
    if (verdict === 'CORRECT') confidence += 0.1;
    if (verdict === 'PARTIAL') confidence += 0.05;

    return Math.min(confidence, 0.95);
  }

  private extractSuggestions(feedback: string): string[] {
    const suggestions: string[] = [];
    const lines = feedback.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if ((trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.toLowerCase().includes('suggest')) &&
          trimmed.length > 10) {
        suggestions.push(trimmed.replace(/^[-•]\s*/, '').trim());
      }
    }

    // If no explicit suggestions found, try to extract key points
    if (suggestions.length === 0) {
      const sentences = feedback.split(/[.!?]+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if ((trimmed.toLowerCase().includes('try') || 
             trimmed.toLowerCase().includes('consider') ||
             trimmed.toLowerCase().includes('recommend')) &&
             trimmed.length > 20) {
          suggestions.push(trimmed);
        }
      }
    }

    return suggestions.slice(0, 3); // Return max 3 suggestions
  }

  private handleApiError(status: number, errorData: any): ApiError {
    // Try to extract the specific error message from the Gemini API response structure
    const apiMessage = errorData?.error?.message;

    switch (status) {
      case 400:
        return {
          code: 'INVALID_REQUEST',
          message: apiMessage || 'Invalid request to AI service. Please check your input.',
          details: errorData,
        };
      case 401:
        return {
          code: 'UNAUTHORIZED',
          message: apiMessage || 'Invalid API key. Please check your Gemini API key configuration.',
          details: errorData,
        };
      case 403:
        return {
          code: 'FORBIDDEN',
          message: apiMessage || 'API access forbidden. Please check your API key permissions.',
          details: errorData,
        };
      case 429:
        return {
          code: 'RATE_LIMITED',
          message: apiMessage || 'Rate limit exceeded. Please wait a moment and try again.',
          details: errorData,
        };
      case 500:
        return {
          code: 'SERVER_ERROR',
          message: apiMessage || 'AI service is temporarily unavailable. Please try again later.',
          details: errorData,
        };
      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: apiMessage || 'An unexpected error occurred. Please try again.',
          details: errorData,
        };
    }
  }

  private handleError(error: any): EvaluationResponse {
    if (error instanceof Error) {
      return {
        success: false,
        feedback: `Evaluation failed: ${error.message}`,
        isCorrect: false,
        errors: [error.message],
      };
    }

    const apiError = error as ApiError;
    return {
      success: false,
      feedback: `AI evaluation error: ${apiError.message}`,
      isCorrect: false,
      errors: [apiError.message],
    };
  }
}


export async function POST(req: NextRequest): Promise<NextResponse<EvaluationResponse | { message: string }>> {
  try {
    const requestBody: EvaluationRequest = await req.json();

    const { instruction, userCode, expectedSolution, language, context, apiKey } = requestBody;

    // Basic validation
    if (!instruction || !userCode || !expectedSolution) {
      return NextResponse.json(
        { message: 'Missing required fields: instruction, userCode, or expectedSolution' },
        { status: 400 }
      );
    }

    // Check API key is provided in the request
    if (!apiKey) {
      return NextResponse.json(
        { message: 'API key is required in the request payload' },
        { status: 400 }
      );
    }

    // Create a new, local instance for this request
    const api = new GeminiAPI(apiKey);

    
    // Call the core evaluation logic using the local instance
    const evaluationResult: EvaluationResponse = await api.evaluateCode({
      instruction,
      userCode,
      expectedSolution,
      language,
      context,
    });

    // Return the successful evaluation response
    return NextResponse.json(evaluationResult, { status: 200 });

  } catch (error) {
    console.error('API Error in POST /evaluate-answer:', error);

    // Differentiate API errors from general server errors
    let errorMessage = 'Internal Server Error during evaluation processing.';
    let status = 500;

    // If the error is an ApiError (thrown by makeRequest's handleApiError or evaluateCode)
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const apiError = error as ApiError;
      errorMessage = apiError.message;
      switch (apiError.code) {
        case 'UNAUTHORIZED':
          // Catch invalid API key error returned from the actual API call
          status = 401;
          break;
        case 'RATE_LIMITED':
          status = 429;
          break;
        case 'SERVER_ERROR':
          status = 500;
          break;
        case 'INVALID_REQUEST':
          status = 400;
          break;
        case 'FORBIDDEN':
            status = 403;
            break;
        default:
          status = 500;
          break;
      }
    } else if (error instanceof Error) {
        // Catch internal logic errors like 'API key not configured'
        if (error.message.includes('API key not configured') || error.message.includes('API key not available')) {
            errorMessage = 'Internal configuration error: API Key is missing for the current request.';
            status = 500;
        } else {
            errorMessage = error.message; 
            status = 500;
        }
    }

    return NextResponse.json(
      { message: errorMessage },
      { status: status }
    );
  }
}
