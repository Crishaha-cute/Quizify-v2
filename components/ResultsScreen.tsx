import React, { useState, useEffect } from 'react';
import { UserAnswer } from '../types.ts';
import { updateHistoryRating } from '../services/historyService.ts';

interface ResultsScreenProps {
  score: number;
  points: number;
  totalQuestions: number;
  userAnswers: UserAnswer[];
  historyId: string | null;
  onPlayAgain: () => void;
}

const StarRating = ({ rating, onChange, disabled }: { rating?: number; onChange: (rating: number) => void, disabled?: boolean }) => {
  const [hoverRating, setHoverRating] = useState<number>(0);
  
  return (
    <div className="flex space-x-2 mt-4 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onPointerEnter={() => !disabled && setHoverRating(star)}
          onPointerLeave={() => !disabled && setHoverRating(0)}
          className={`focus:outline-none transition-transform ${disabled ? 'cursor-not-allowed opacity-80' : 'hover:scale-110'}`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-8 w-8 ${
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

const useCountUp = (end: number, duration: number) => {
    const [count, setCount] = useState(0);
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
  
    useEffect(() => {
      let frame = 0;
      const counter = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const currentCount = Math.round(end * progress);
        setCount(currentCount);
  
        if (frame === totalFrames) {
          clearInterval(counter);
        }
      }, frameRate);
  
      return () => clearInterval(counter);
    }, [end, duration, totalFrames]);
  
    return count;
};

const Confetti: React.FC = () => {
    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-20">
            {Array.from({ length: 50 }).map((_, i) => {
                const style = {
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 3 + 4}s`,
                    animationDelay: `${Math.random() * 5}s`,
                    backgroundColor: ['#a855f7', '#d8b4fe', '#facc15', '#4ade80'][Math.floor(Math.random() * 4)]
                };
                return <div key={i} className="confetti" style={style} />;
            })}
        </div>
    );
};


const ResultsScreen: React.FC<ResultsScreenProps> = ({ score, points, totalQuestions, userAnswers, historyId, onPlayAgain }) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  const animatedScore = useCountUp(score, 1000);
  const animatedPercentage = useCountUp(percentage, 1000);
  const animatedPoints = useCountUp(points, 1000);
  
  const [rating, setRating] = useState<number>(0);
  const [isRatingSaved, setIsRatingSaved] = useState<boolean>(false);

  const handleRatingChange = async (newRating: number) => {
      if (isRatingSaved || !historyId) return;
      
      setRating(newRating);
      try {
          await updateHistoryRating(historyId, newRating);
          setIsRatingSaved(true);
      } catch (error) {
          console.error('Failed to update rating:', error);
          setRating(0); // Revert
      }
  };

  let feedbackMessage = "Good effort! Keep practicing!";
  if (percentage >= 80) {
    feedbackMessage = "Excellent work! You're a quiz master!";
  } else if (percentage >= 50) {
    feedbackMessage = "Great job! You're on your way to mastery!";
  }

  const showConfetti = percentage >= 80;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative bg-white/60 dark:bg-black/30 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30 text-center flex flex-col max-h-[95vh]">
        <div className="flex-shrink-0">
            {showConfetti && <Confetti />}
            <div className="flex items-center justify-center space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <h2 className="text-4xl font-bold">Quiz Complete!</h2>
            </div>
            <p className="text-purple-600 dark:text-purple-300 text-xl mt-2 mb-6">{feedbackMessage}</p>
            <div className="bg-purple-500/10 dark:bg-purple-500/20 rounded-lg p-6 mb-8">
              <p className="text-2xl">Your Results</p>
              <p className="text-6xl font-bold my-2">{animatedScore} / {totalQuestions}</p>
              <p className="text-3xl font-semibold text-purple-700 dark:text-purple-200">{animatedPercentage}%</p>
              <p className="text-xl mt-3 text-purple-700 dark:text-purple-200 font-semibold">Points: {animatedPoints}</p>
            </div>
        </div>

        {historyId && (
            <div className="bg-purple-500/10 dark:bg-purple-500/20 rounded-lg p-6 mb-8 mx-4">
                <p className="text-xl font-semibold mb-2">Rate this Quiz</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {isRatingSaved ? 'Thank you for your feedback!' : 'How was your experience?'}
                </p>
                <StarRating rating={rating} onChange={handleRatingChange} disabled={isRatingSaved} />
            </div>
        )}

        <div className="text-left my-8 flex-1 min-h-0 flex flex-col">
            <h3 className="text-2xl font-semibold mb-4 text-center flex-shrink-0">Review Your Answers</h3>
            <div className="space-y-4 overflow-y-auto pr-4">
                {userAnswers.map((answer, index) => (
                    <div key={index} className={`p-4 rounded-lg flex items-start space-x-4 ${answer.isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {answer.isCorrect ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 dark:text-green-400 flex-shrink-0 mt-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        <div>
                           <p className="font-bold text-lg mb-2" dangerouslySetInnerHTML={{ __html: answer.question }}></p>
                           <p className={`mb-1 ${answer.isCorrect ? '' : 'line-through text-red-600 dark:text-red-300'}`} dangerouslySetInnerHTML={{ __html: `Your answer: ${answer.selectedAnswer || 'Not answered'}`}}></p>
                           {!answer.isCorrect && (
                             <p className="text-green-600 dark:text-green-300" dangerouslySetInnerHTML={{ __html: `Correct answer: ${answer.correctAnswer}`}}></p>
                           )}
                           {typeof answer.pointsAwarded === 'number' && (
                             <p className="text-sm text-purple-700/90 dark:text-purple-200/90 mt-1">
                               Points: {answer.pointsAwarded}
                             </p>
                           )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        <div className="flex-shrink-0">
            <button
              onClick={onPlayAgain}
              className="w-full md:w-auto flex items-center justify-center py-3 px-8 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 transform hover:scale-105 transition-all duration-300 ease-in-out shimmer-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.885.666A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.666-1.885z" clipRule="evenodd" />
              </svg>
              <span>Play Again</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;