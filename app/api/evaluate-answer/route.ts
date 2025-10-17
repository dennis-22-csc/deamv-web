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
      console.error('Gemini API evaluation error:', error);
      
      // Propagate the configuration error to the handler
      if (error instanceof Error && error.message.includes('API key not configured')) {
        throw error;
      }

      return this.handleError(error);
    }
  }

  async generateChallenge(category: string, difficulty?: string): Promise<{ instruction: string; solution: string }> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured');
      }

      const prompt = this.buildChallengeGenerationPrompt(category, difficulty);
      const response = await this.makeRequest(prompt);

      return this.parseChallengeGenerationResponse(response);
    } catch (error) {
      console.error('Gemini API challenge generation error:', error);
      throw error;
    }
  }

  async explainConcept(concept: string, context?: string): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured');
      }

      const prompt = this.buildExplanationPrompt(concept, context);
      const response = await this.makeRequest(prompt);

      return this.parseExplanationResponse(response);
    } catch (error) {
      console.error('Gemini API explanation error:', error);
      throw error;
    }
  }

  /**
   * Validates the API key. Throws an error with the API message on bad key/request (4xx)
   * or temporary server error (5xx). Returns boolean only on success.
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testPrompt = 'Respond with "OK" if you can read this.';
      const response = await fetch(`${this.baseURL}/models/${this.config.model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: testPrompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0.1
          }
        })
      });
      
      // If not OK, handle and throw
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        // Extract error message from API response if available, otherwise use status text
        const apiErrorMessage = errorData?.error?.message || `API validation failed with status ${response.status}`;
        
        // Throw an error that includes the API message
        // For 401 specifically, we can use a known prefix to identify it in the catch block
        if (response.status === 401) {
            throw new Error(`GEMINI_API_KEY_ERROR: ${apiErrorMessage}`);
        }
        // For 5xx errors, use the previous temporary error message
        if (response.status >= 500) {
            throw new Error(`Gemini Service Temporary Error (Status ${response.status}): ${apiErrorMessage}`);
        }
        // For other non-OK status (e.g., 400), also throw the specific error
        throw new Error(`GEMINI_API_VALIDATION_ERROR: ${apiErrorMessage}`);
      }

      // If OK (status 200-299), check the content.
      const data = await response.json();
      // This ensures we return true only if the response is valid and parseable
      return !!data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
      // Re-throw the specific errors we created in the block above
      if (error instanceof Error && (error.message.includes('GEMINI_API_KEY_ERROR') || error.message.includes('Gemini Service Temporary Error') || error.message.includes('GEMINI_API_VALIDATION_ERROR'))) {
          throw error;
      }
      console.error('API key validation failed due to network/parsing:', error);
      // For network failure, etc., throw a general error to be handled by the route
      throw new Error('Network or unexpected error during API key validation.');
    }
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

  private buildChallengeGenerationPrompt(category: string, difficulty?: string): string {
    return `
Generate a data science coding challenge in the category: ${category}
${difficulty ? `Difficulty level: ${difficulty}` : ''}

Please provide:
1. A clear instruction describing the problem to solve
2. A complete, correct Python solution

Requirements:
- The challenge should be practical and relevant to data science
- The solution should demonstrate good Python practices
- Include appropriate comments in the solution
- Make the challenge solvable in 10-25 lines of code
- Focus on real-world data science scenarios

Format your response as JSON:
{
  "instruction": "Clear description of what to implement...",
  "solution": "Complete Python solution code with comments..."
}

Category: ${category}
${difficulty ? `Difficulty: ${difficulty}` : ''}
`.trim();
  }

  private buildExplanationPrompt(concept: string, context?: string): string {
    return `
Explain the following data science concept in simple, clear terms:

Concept: ${concept}
${context ? `Context: ${context}` : ''}

Please provide:
- A clear definition
- 1-2 practical examples
- Common use cases in data science
- Key points to remember

Keep the explanation concise (3-5 sentences maximum) and focused on practical application.
`.trim();
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
      throw this.handleApiError(response.status, errorData);
    }

    return await response.json();
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

  private parseChallengeGenerationResponse(apiResponse: any): { instruction: string; solution: string } {
    try {
      const text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response text from API');
      }

      // Try to parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*"instruction"[\s\S]*"solution"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          instruction: parsed.instruction,
          solution: parsed.solution,
        };
      }

      // Fallback: extract instruction and solution from text
      const lines = text.split('\n');
      let instruction = '';
      let solution = '';
      let inSolution = false;

      for (const line of lines) {
        if (line.toLowerCase().includes('instruction') || line.toLowerCase().includes('problem')) {
          instruction = line.replace(/.*?(instruction|problem):?\s*/i, '').trim();
        } else if (line.toLowerCase().includes('solution') || line.includes('```')) {
          inSolution = !inSolution;
          if (line.includes('```')) continue;
        } else if (inSolution) {
          solution += line + '\n';
        } else if (!instruction && line.trim()) {
          instruction = line.trim();
        }
      }

      return {
        instruction: instruction || 'Solve the following data science problem',
        solution: solution.trim() || '# Solution not generated properly',
      };
    } catch (error) {
      console.error('Error parsing challenge generation response:', error);
      throw new Error('Failed to parse generated challenge');
    }
  }

  private parseExplanationResponse(apiResponse: any): string {
    try {
      const text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || 'Explanation not available.';
    } catch (error) {
      console.error('Error parsing explanation response:', error);
      return 'Failed to generate explanation. Please try again.';
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

// Global instance removed to prevent race condition (as fixed previously)
// const geminiAPI = new GeminiAPI(); // REMOVED

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

    // Validate API key is provided in the request
    if (!apiKey) {
      return NextResponse.json(
        { message: 'API key is required in the request payload' },
        { status: 400 }
      );
    }

    // Create a new, local instance for this request
    const api = new GeminiAPI(apiKey);

    // Validate the API key using the local instance
    // Note: The validateApiKey method now THROWS an error on any non-2xx status code.
    try {
      const isValidKey = await api.validateApiKey(apiKey);
      // This block is reached on a successful key validation (2xx response with content)
      if (!isValidKey) {
        // Theoretically, this should only be reached if the API returns 2xx but no content,
        // which we treat as a non-fatal validation failure but still return a custom error.
        return NextResponse.json(
          { message: 'Evaluation failed: API key validation failed (response content issue).' }, 
          { status: 401 }
        );
      }
    } catch (validationError) {
      console.error('API Key validation failed:', validationError);
      
      if (validationError instanceof Error) {
        // 1. Catch the specific Invalid API Key error and extract the message
        if (validationError.message.startsWith('GEMINI_API_KEY_ERROR:')) {
            // Extract actual error message from the API, removing the custom prefix
            const message = validationError.message.replace('GEMINI_API_KEY_ERROR: ', '');
            return NextResponse.json(
              { message: message },
              { status: 401 }
            );
        }
        // 2. Catch the Service Temporary Error (5xx)
        if (validationError.message.includes('Gemini Service Temporary Error')) {
            // Extract message or use a general one
            const match = validationError.message.match(/:\s*(.*)/);
            const message = match ? match[1] : 'Service unavailable. Please wait a moment and try again.';
            return NextResponse.json(
              { message: message },
              { status: 503 }
            );
        }
        // 3. Catch other API Validation Errors (e.g., 400 bad request)
        if (validationError.message.startsWith('GEMINI_API_VALIDATION_ERROR:')) {
            const message = validationError.message.replace('GEMINI_API_VALIDATION_ERROR: ', '');
            return NextResponse.json(
              { message: `API Key validation failed: ${message}` },
              { status: 400 } // Use 400 for general validation issues
            );
        }
        // 4. Catch general network/unexpected errors
        if (validationError.message.includes('Network or unexpected error')) {
            return NextResponse.json(
              { message: 'A network error occurred while validating the API key.' },
              { status: 500 }
            );
        }
      }
      
      // Default validation error response
      return NextResponse.json(
        { message: 'Evaluation failed: Could not validate API key.' }, 
        { status: 401 }
      );
    }

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

    // If the error is an ApiError (thrown by makeRequest's handleApiError)
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const apiError = error as ApiError;
      errorMessage = apiError.message;
      switch (apiError.code) {
        case 'UNAUTHORIZED':
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

// Convenience functions (Keep these functions creating local instances)
export const evaluateCodeWithGemini = async (
  instruction: string,
  userCode: string,
  expectedSolution: string,
  apiKey: string
): Promise<EvaluationResponse> => {
  const api = new GeminiAPI(apiKey);
  return api.evaluateCode({
    instruction,
    userCode,
    expectedSolution,
    language: 'python',
  });
};

export const generateDataScienceChallenge = async (
  category: string,
  apiKey: string,
  difficulty?: string
): Promise<{ instruction: string; solution: string }> => {
  const api = new GeminiAPI(apiKey);
  return api.generateChallenge(category, difficulty);
};

export const explainDataScienceConcept = async (
  concept: string,
  apiKey: string,
  context?: string
): Promise<string> => {
  const api = new GeminiAPI(apiKey);
  return api.explainConcept(concept, context);
};

export const validateGeminiApiKey = async (apiKey: string): Promise<boolean> => {
  const api = new GeminiAPI(apiKey);
  // The convenience function might need to be wrapped if consumers don't expect it to throw
  // For the scope of the fix, we keep the signature as is, assuming consumers handle the throw.
  return api.validateApiKey(apiKey);
};

// Mock API for development/demo purposes (remains unchanged)
export const mockEvaluateCode = async (
  instruction: string,
  userCode: string,
  expectedSolution: string
): Promise<EvaluationResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Simple mock evaluation logic
  const isCorrect = Math.random() > 0.3;
  const isPartial = !isCorrect && Math.random() > 0.5;

  const feedback = isCorrect 
    ? "Great job! Your solution is correct and follows good coding practices. The logic is sound and the code is readable. VERDICT: CORRECT"
    : isPartial
    ? "Your solution is on the right track but has some issues. The main logic works, but there are edge cases not handled. Consider adding input validation. VERDICT: PARTIAL"
    : "There are some issues with your solution. The logic doesn't quite match the expected behavior. Review the requirements and try again. VERDICT: INCORRECT";

  return {
    success: true,
    feedback,
    isCorrect,
    score: isCorrect ? 100 : isPartial ? 70 : 0,
    confidence: 0.8 + Math.random() * 0.15,
    suggestions: [
      "Consider adding comments for complex logic",
      "Use more descriptive variable names",
      "Handle edge cases appropriately"
    ].slice(0, 1 + Math.floor(Math.random() * 2))
  };
};
