// types/quiz.ts
export interface QuizQuestion {
  Question: string;
  Answer: string;
  Category: string;
  Type: 'Practical' | 'Theoretical';
  id?: string;
}

export interface GradedQuizSession {
  questions: QuizQuestion[];
  startTime: number;
  endTime?: number;
  registrationCode: string;
  userAnswers: { [questionIndex: number]: string };
  currentQuestionIndex: number;
  timeLimit: number;
  submitted?: boolean;
}

export interface QuizSubmission {
  registrationCode: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  answers: { [questionIndex: number]: string };
  totalTime: number;
}
