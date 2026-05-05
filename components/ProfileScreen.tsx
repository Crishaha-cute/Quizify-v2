import React, { useState } from 'react';
import { User, QuizHistory, Difficulty } from '../types.ts';
import Spinner from './Spinner.tsx';
import { updateHistoryRating } from '../services/historyService.ts';

interface ProfileScreenProps {
  user: User;
  history: QuizHistory[];
  onLogout: () => void;
  isLoading: boolean;
}

const StarRating = ({ rating, onChange }: { rating?: number; onChange: (rating: number) => void }) => {
  const [hoverRating, setHoverRating] = useState<number>(0);
  
  return (
    <div className="flex space-x-1 mt-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onPointerEnter={() => setHoverRating(star)}
          onPointerLeave={() => setHoverRating(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 ${
              star <= (hoverRating || rating || 0) 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300 dark:text-gray-600'
            }`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.898 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

const getDifficultyClass = (difficulty: string) => {
  switch (difficulty) {
    case Difficulty.EASY: return 'bg-green-500/20 text-green-600 dark:text-green-300';
    case Difficulty.MEDIUM: return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-300';
    case Difficulty.HARD: return 'bg-red-500/20 text-red-600 dark:text-red-300';
    default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-300';
  }
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, history: initialHistory, onLogout, isLoading }) => {
  const [history, setHistory] = useState<QuizHistory[]>(initialHistory);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  // Update local history state when initialHistory prop changes
  React.useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  const handleRatingChange = async (historyId: string, rating: number) => {
    try {
      // Optimistically update the UI
      setHistory(prev => prev.map(item => 
        item.id === historyId ? { ...item, rating } : item
      ));
      
      // Update in database
      await updateHistoryRating(historyId, rating);
    } catch (error) {
      console.error('Failed to update rating:', error);
      // Revert on failure (reload from props)
      setHistory(initialHistory);
    }
  };
  return (
    <div className="w-full max-w-3xl mx-auto pt-8 md:pt-12">
        <div className="flex flex-col items-center text-center mb-8 form-element-animation" style={{ animationDelay: '0s' }}>
            <div className="w-24 h-24 bg-purple-500/10 dark:bg-purple-500/30 rounded-full flex items-center justify-center border-2 border-purple-500 dark:border-purple-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-600 dark:text-purple-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">{user.username.split('@')[0]}</h1>
            <p className="text-purple-600 dark:text-purple-300">{user.username}</p>
             <button
              onClick={onLogout}
              className="mt-4 flex items-center space-x-2 py-2 px-4 bg-red-600/10 dark:bg-red-600/30 text-red-500 dark:text-red-300 font-semibold rounded-lg hover:bg-red-600/20 dark:hover:bg-red-600/50 hover:text-red-600 dark:hover:text-white transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
            </button>
        </div>

        <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30 form-element-animation" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-2xl font-semibold mb-4 text-purple-700 dark:text-purple-200 text-center">Quiz History</h2>
            {isLoading ? (
                <div className="text-center py-8"><Spinner /></div>
            ) : history.length > 0 ? (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                    {history.map(item => {
                       const percentage = Math.round((item.score / item.totalQuestions) * 100);
                       return (
                        <div key={item.id} className="bg-gray-200/50 dark:bg-white/5 p-4 rounded-lg border border-purple-200 dark:border-purple-400/20 hover:bg-gray-200 dark:hover:bg-white/10 hover:border-purple-400 dark:hover:border-purple-400/50 transition-all transform hover:scale-[1.02]">
                            <div className="flex justify-between items-start">
                                <div className='flex-1 pr-4'>
                                    <p className="font-bold text-lg leading-tight">{item.topic}</p>
                                    <p className="text-sm text-purple-600 dark:text-purple-300">{item.date}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-2xl font-bold">{percentage}%</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.score} / {item.totalQuestions}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                             <div className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${getDifficultyClass(item.difficulty)}`}>
                                {item.difficulty}

                            </div>
                                <div className="flex flex-col items-end">
                                    <StarRating 
                                      rating={item.rating} 
                                      onChange={(rating) => handleRatingChange(item.id, rating)} 
                                    />
                                    {item.answers && item.answers.length > 0 && (
                                        <button
                                            onClick={() => setExpandedQuizId(expandedQuizId === item.id ? null : item.id)}
                                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-2 flex items-center"
                                        >
                                            {expandedQuizId === item.id ? 'Hide Answers' : 'Review Answers'}
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ml-1 transform transition-transform ${expandedQuizId === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {expandedQuizId === item.id && item.answers && (
                                <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-400/20 space-y-3">
                                    {item.answers.map((answer, index) => (
                                        <div key={index} className={`p-3 rounded-lg text-sm flex items-start space-x-3 ${answer.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                            {answer.isCorrect ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: answer.question }}></p>
                                                <p className={`mt-1 ${answer.isCorrect ? 'text-green-600 dark:text-green-400' : 'line-through text-red-600 dark:text-red-400'}`} dangerouslySetInnerHTML={{ __html: `Your answer: ${answer.selectedAnswer || 'Not answered'}`}}></p>
                                                {!answer.isCorrect && (
                                                    <p className="text-green-600 dark:text-green-400 mt-1" dangerouslySetInnerHTML={{ __html: `Correct answer: ${answer.correctAnswer}`}}></p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                       );
                    })}
                </div>
            ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-4">You haven't completed any quizzes yet.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default ProfileScreen;