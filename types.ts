export interface User {
  id: number;
  username: string; // Using username as email for simplicity
}

export enum QuizType {
  MULTIPLE_CHOICE = 'Multiple Choice',
  IDENTIFICATION = 'Identification',
  TRUE_OR_FALSE = 'True or False',
}

export interface QuizHistory {
  id: string; 
  topic: string;
  difficulty: string;
  score: number;
  totalQuestions: number;
  date: string;
  rating?: number;
  answers?: UserAnswer[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  questionType?: QuizType | 'Multiple Choice' | 'Identification' | 'True or False';
  difficulty?: Difficulty | 'Easy' | 'Medium' | 'Hard';
}

export interface UserAnswer {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsAwarded?: number;
}

export enum GameState {
  LOGIN,
  REGISTER,
  SETUP,
  LOADING,
  QUIZ,
  RESULTS,
  PROFILE,
  PROGRESS,
  LEADERBOARD,
  ADMIN_DASHBOARD,
}

export enum AdminSection {
  DASHBOARD = 'Dashboard',
  QUIZZES = 'Quiz Management',
  QUESTIONS = 'Questions',
  USERS = 'Users',
  LEADERBOARD = 'Leaderboard',
  SEASONS = 'Seasons',
  UPLOADED_FILES = 'Uploaded Files',
  ANALYTICS = 'Analytics',
}

export enum Difficulty {
    EASY = 'Easy',
    MEDIUM = 'Medium',
    HARD = 'Hard'
}

export const difficultyToPoints = (difficulty: Difficulty | string): number => {
  const key = String(difficulty).toLowerCase();
  switch (key) {
    case 'easy':
      return 20;
    case 'medium':
      return 50;
    case 'hard':
      return 80;
    default:
      return 0;
  }
};