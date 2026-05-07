import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Difficulty, QuizQuestion, UserAnswer, User, QuizHistory, QuizType, difficultyToPoints } from './types.ts';
import { generateQuiz } from './services/geminiService.ts';
import * as authService from './services/authService.ts';
import * as historyService from './services/historyService.ts';
import * as activityService from './services/activityService.ts';

import SetupScreen from './components/SetupScreen.tsx';
import QuizScreen from './components/QuizScreen.tsx';
import ResultsScreen from './components/ResultsScreen.tsx';
import Spinner from './components/Spinner.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import RegisterScreen from './components/RegisterScreen.tsx';
import ProfileScreen from './components/ProfileScreen.tsx';
import ProgressScreen from './components/ProgressScreen.tsx';
import BottomNavBar from './components/BottomNavBar.tsx';
import LeaderboardScreen from './components/LeaderboardScreen.tsx';
import * as leaderboardService from './services/leaderboardService.ts';
import AdminApp from './components/admin/AdminApp.tsx';
import * as profileService from './services/profileService.ts';


const NUMBER_OF_QUESTIONS = 10;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuizConfig, setCurrentQuizConfig] = useState<{ topic: string, difficulty: Difficulty; quizType: QuizType } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0); // number correct
  const [points, setPoints] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    // Set document title
    document.title = 'QuiziFy';
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for OAuth callback first
      const oauthUser = await authService.handleOAuthCallback();
      if (oauthUser) {
        setUser(oauthUser);
        setGameState(GameState.SETUP);
        return;
      }

      // Otherwise check for existing session
      const currentUser = await authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAdmin(await profileService.getIsAdmin());
      setGameState(GameState.SETUP);
    } else {
      setGameState(GameState.LOGIN);
    }
    };
    checkAuth();

    // Listen for auth state changes (including OAuth redirects)
    const unsubscribe = authService.onAuthStateChange((user) => {
      if (user) {
        setUser(user);
        profileService.getIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
        setGameState(GameState.SETUP);
      } else {
        setUser(null);
        setIsAdmin(false);
        if (gameState !== GameState.LOGIN && gameState !== GameState.REGISTER) {
          setGameState(GameState.LOGIN);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if ((gameState === GameState.PROFILE || gameState === GameState.PROGRESS) && user) {
      const fetchHistory = async () => {
        setIsHistoryLoading(true);
        const history = await historyService.getHistory();
        setQuizHistory(history);
        setIsHistoryLoading(false);
      };
      fetchHistory();
    }
  }, [gameState, user]);


  const handleStartQuiz = useCallback(async (topic: string, difficulty: Difficulty, quizType: QuizType, fileContent: string | null) => {
    setLoadingMessage('Generating your quiz...');
    setGameState(GameState.LOADING);
    setError(null);
    try {
      setCurrentQuizConfig({ topic, difficulty, quizType });
      const questions = await generateQuiz(topic, difficulty, quizType, NUMBER_OF_QUESTIONS, fileContent);
      if (questions.length < NUMBER_OF_QUESTIONS) {
        throw new Error("Could not generate enough questions for the quiz.");
      }
      setQuiz(questions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setPoints(0);
      setUserAnswers([]);
      setGameState(GameState.QUIZ);
    } catch (err: any) {
      setError(err.message || 'Unknown error.');
      setGameState(GameState.SETUP);
    }
  }, []);

  const handleAnswerSubmit = useCallback(async (selectedAnswer: string) => {
    const currentQuestion = quiz[currentQuestionIndex];
    const normalizedSelected = (selectedAnswer ?? '').trim();
    const normalizedCorrect = (currentQuestion.correctAnswer ?? '').trim();
    const isCorrect = normalizedSelected.localeCompare(normalizedCorrect, undefined, { sensitivity: 'accent' }) === 0;
    const questionDifficulty = (currentQuestion.difficulty as Difficulty | undefined) || currentQuizConfig?.difficulty || Difficulty.EASY;
    const pointsForQuestion = isCorrect ? difficultyToPoints(questionDifficulty) : 0;

    let updatedScore = score;
    if (isCorrect) {
      updatedScore = score + 1;
      setScore(prev => prev + 1);
    }
    const updatedPoints = points + pointsForQuestion;
    if (pointsForQuestion > 0) {
      setPoints(prev => prev + pointsForQuestion);
    }

    const newUserAnswers = [
      ...userAnswers,
      {
        question: currentQuestion.question,
        selectedAnswer: normalizedSelected,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
        pointsAwarded: pointsForQuestion,
      },
    ];
    setUserAnswers(newUserAnswers);

    if (currentQuestionIndex >= quiz.length - 1) {
        if (user && currentQuizConfig) {
            const savedId = await historyService.saveHistory(currentQuizConfig.topic, currentQuizConfig.difficulty, updatedScore, updatedPoints, quiz.length, newUserAnswers);
            setCurrentHistoryId(savedId);
            // Log the quiz completion activity
            activityService.logActivity('quiz_completion', `Completed ${currentQuizConfig.topic} (${currentQuizConfig.difficulty}) - Score: ${updatedScore}/${quiz.length}`).catch(console.error);
            // Update seasonal leaderboard points (only once, at end of quiz)
            try {
              await leaderboardService.addPointsForCurrentUser(updatedPoints);
            } catch (e) {
              console.warn('Failed to update leaderboard points:', e);
            }
        }
    }

    setTimeout(() => {
        if (currentQuestionIndex < quiz.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setGameState(GameState.RESULTS);
        }
    }, 1500);
  }, [currentQuestionIndex, quiz, userAnswers, score, points, user, currentQuizConfig]);

  const handlePlayAgain = useCallback(() => {
    setGameState(GameState.SETUP);
    setQuiz([]);
    setCurrentQuizConfig(null);
    setCurrentHistoryId(null);
  }, []);

  const handleQuitQuiz = useCallback(() => {
    setGameState(GameState.SETUP);
    setQuiz([]);
    setCurrentQuizConfig(null);
    setCurrentHistoryId(null);
  }, []);

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setRegistrationSuccess(false); // Clear success notification on login
    
    // Check if user is admin
    try {
      const isAdminUser = await profileService.getIsAdmin();
      if (isAdminUser) {
        // Redirect to admin dashboard
        window.location.href = '/admin';
        return;
      }
    } catch (err) {
      console.error('Failed to check admin status:', err);
    }
    
    setGameState(GameState.SETUP);
    // Log the login activity
    activityService.logActivity('login', `User ${loggedInUser.username} logged in`).catch(console.error);
  };

  const handleRegisterSuccess = () => {
    // After registration, navigate to login page with success notification
    setRegistrationSuccess(true);
    setGameState(GameState.LOGIN);
  };
  
  const handleLogout = () => {
    // Log the logout activity before clearing the user
    if (user) {
      activityService.logActivity('logout', `User ${user.username} logged out`).catch(console.error);
    }
    authService.logout();
    profileService.clearIsAdminCache();
    setUser(null);
    setIsAdmin(false);
    setGameState(GameState.LOGIN);
    setQuizHistory([]);
  };

  const handleNavigate = (state: GameState) => {
    setError(null);
    setRegistrationSuccess(false); // Clear success message when navigating away
    setGameState(state);
  };


  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname === '/admin';

  const renderContent = () => {
    // Separate admin interface on /admin (distinct UI + sidebar)
    if (isAdminRoute) {
      return <AdminApp />;
    }
    switch (gameState) {
      case GameState.LOGIN:
        return <LoginScreen onLoginSuccess={handleLoginSuccess} onNavigateToRegister={() => handleNavigate(GameState.REGISTER)} showRegistrationSuccess={registrationSuccess} onDismissSuccess={() => setRegistrationSuccess(false)} />;
      case GameState.REGISTER:
        return <RegisterScreen onRegisterSuccess={handleRegisterSuccess} onNavigateToLogin={() => handleNavigate(GameState.LOGIN)} />;
      case GameState.PROFILE:
        if (!user) return null; // Should not happen
        return <ProfileScreen user={user} history={quizHistory} onLogout={handleLogout} isLoading={isHistoryLoading} />;
      case GameState.PROGRESS:
        return <ProgressScreen history={quizHistory} isLoading={isHistoryLoading} />;
      case GameState.LEADERBOARD:
        return <LeaderboardScreen />;
      case GameState.ADMIN_DASHBOARD:
        // in-app admin screen is deprecated in favor of /admin
        return <AdminApp />;
      case GameState.SETUP:
        return (
          <>
            {error && <div className="bg-red-500/80 text-white p-4 rounded-lg mb-6 text-center">{error}</div>}
            <SetupScreen onStartQuiz={handleStartQuiz} />
          </>
        );
      case GameState.LOADING:
        return (
            <div>
                <Spinner />
                <p className="text-gray-800 dark:text-white text-center mt-4 text-lg">{loadingMessage || 'Loading...'}</p>
            </div>
        );
      case GameState.QUIZ:
        return (
          <QuizScreen
            question={quiz[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={quiz.length}
            onAnswerSubmit={handleAnswerSubmit}
            onQuitQuiz={handleQuitQuiz}
          />
        );
      case GameState.RESULTS:
        return (
          <ResultsScreen
            score={score}
            points={points}
            totalQuestions={quiz.length}
            userAnswers={userAnswers}
            historyId={currentHistoryId}
            onPlayAgain={handlePlayAgain}
          />
        );
      default:
        return null;
    }
  };

  const isAuthScreen = gameState === GameState.LOGIN || gameState === GameState.REGISTER;
  const showBottomNav =
    user &&
    !isAdminRoute &&
    (gameState === GameState.SETUP ||
      gameState === GameState.PROFILE ||
      gameState === GameState.PROGRESS ||
      gameState === GameState.LEADERBOARD);
  const shouldNotBeVerticallyCentered =
    isAuthScreen ||
    gameState === GameState.SETUP ||
    gameState === GameState.PROFILE ||
    gameState === GameState.PROGRESS ||
    gameState === GameState.LEADERBOARD ||
    gameState === GameState.ADMIN_DASHBOARD;

  return (
    <div className={`min-h-screen w-full ${isAdminRoute ? '' : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white flex flex-col items-center p-4'} ${shouldNotBeVerticallyCentered ? '' : 'justify-center'}`}>
        <div key={gameState} className="w-full page-transition pb-20 md:pb-0">
             {renderContent()}
        </div>
        {showBottomNav && <BottomNavBar activeState={gameState} onNavigate={handleNavigate} isAdmin={isAdmin} />}
    </div>
  );
};

export default App;