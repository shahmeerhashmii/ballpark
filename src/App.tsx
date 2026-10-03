import React, { useState, useEffect, useMemo, useCallback } from 'react';
import questionsData from './data/questions.json';
import { QuestionsByDay } from '../scripts/build-questions';
import {
  DayProgress,
  QuestionGuessResult,
  PlayerStats,
  QueuedGuess,
} from './types';
import {
  getCurrentPuzzleDay,
  decodeAnswer,
} from './lib/daily';
import {
  getOrCreatePlayerId,
  getHasSeenHowToPlay,
  setHasSeenHowToPlay,
  getDayProgress,
  saveDayProgress,
  getPlayerStats,
  updateStatsOnGameComplete,
  resetLocalData,
} from './lib/storage';
import {
  submitGuessToSupabase,
  syncQueuedGuesses,
} from './lib/supabase';
import { calculateScore } from './lib/scoring';

// Screens & Modals
import { HomeScreen } from './screens/HomeScreen';
import { QuestionScreen } from './screens/QuestionScreen';
import { RevealScreen } from './screens/RevealScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { CountdownScreen } from './screens/CountdownScreen';
import { EndedScreen } from './screens/EndedScreen';
import { HowToPlayModal } from './components/HowToPlayModal';
import { StatsModal } from './components/StatsModal';
import { InstallPrompt } from './components/InstallPrompt';

const allQuestions = questionsData as QuestionsByDay;

export const App: React.FC = () => {
  // Check for dev mode URL query params (?day=N and ?reset)
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    if (import.meta.env.DEV && queryParams.has('reset')) {
      resetLocalData();
      console.log('Local data cleared via ?reset');
    }
  }, [queryParams]);

  // Determine current day
  const puzzleMeta = getCurrentPuzzleDay();
  const dayNumber = useMemo(() => {
    if (import.meta.env.DEV && queryParams.has('day')) {
      const paramDay = parseInt(queryParams.get('day') || '1', 10);
      if (!isNaN(paramDay)) return paramDay;
    }
    return puzzleMeta.dayNumber;
  }, [puzzleMeta.dayNumber, queryParams]);

  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const [stats, setStats] = useState<PlayerStats>(getPlayerStats);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  // Sync any queued offline guesses when online
  useEffect(() => {
    syncQueuedGuesses();
    const handleOnline = () => syncQueuedGuesses();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Show How to Play on first visit
  useEffect(() => {
    if (!getHasSeenHowToPlay()) {
      setIsHowToPlayOpen(true);
      setHasSeenHowToPlay(true);
    }
  }, []);

  // Questions for the selected day
  const todayQuestions = allQuestions[dayNumber] || [];

  // Initialize Game Progress
  const [progress, setProgress] = useState<DayProgress>(() => {
    const saved = getDayProgress(dayNumber);
    if (saved) return saved;

    return {
      dayNumber,
      currentQIndex: 1,
      screen: 'home',
      guesses: [],
      questionStartTime: null,
      isFinished: false,
    };
  });

  const updateAndSaveProgress = useCallback((newProgress: DayProgress) => {
    setProgress(newProgress);
    saveDayProgress(newProgress);
  }, []);

  // Start Playing
  const handleStartPlay = () => {
    const existing = getDayProgress(dayNumber);
    if (existing && existing.isFinished) {
      updateAndSaveProgress({
        ...existing,
        screen: 'results',
      });
      return;
    }

    if (existing && existing.guesses.length > 0) {
      updateAndSaveProgress(existing);
      return;
    }

    const initialProgress: DayProgress = {
      dayNumber,
      currentQIndex: 1,
      screen: 'question',
      guesses: [],
      questionStartTime: Date.now(),
      isFinished: false,
    };
    updateAndSaveProgress(initialProgress);
  };

  // Submit a guess
  const handleProcessGuess = (guessVal: number) => {
    const qIndex = progress.currentQIndex;
    const currentQData = todayQuestions[qIndex - 1];
    if (!currentQData) return;

    const decodedAns = decodeAnswer(currentQData.answer);
    const scoreResult = calculateScore(guessVal, decodedAns);

    const guessResult: QuestionGuessResult = {
      qIndex,
      question: currentQData.question,
      unit: currentQData.unit,
      category: currentQData.category,
      difficulty: currentQData.difficulty,
      answer: decodedAns,
      guess: guessVal,
      percentOff: scoreResult.percentOff,
      points: scoreResult.points,
      bandLabel: scoreResult.bandLabel,
      color: scoreResult.color,
    };

    const newGuesses = [...progress.guesses, guessResult];

    // Submit to Supabase / queue
    const queuedItem: QueuedGuess = {
      player_id: playerId,
      puzzle_day: dayNumber,
      q_index: qIndex,
      guess: guessVal > 0 ? guessVal : 0.0001, // Store positive numeric
      points: scoreResult.points,
    };
    submitGuessToSupabase(queuedItem);

    const isLast = qIndex >= 5;
    const updated: DayProgress = {
      ...progress,
      guesses: newGuesses,
      screen: 'reveal',
      questionStartTime: null,
      isFinished: isLast,
    };

    updateAndSaveProgress(updated);

    if (isLast) {
      const totalScore = newGuesses.reduce((acc, g) => acc + g.points, 0);
      const updatedStats = updateStatsOnGameComplete(dayNumber, totalScore);
      setStats(updatedStats);
    }
  };

  // Next Question from Reveal
  const handleNextFromReveal = () => {
    if (progress.currentQIndex >= 5) {
      updateAndSaveProgress({
        ...progress,
        screen: 'results',
      });
    } else {
      updateAndSaveProgress({
        ...progress,
        currentQIndex: progress.currentQIndex + 1,
        screen: 'question',
        questionStartTime: Date.now(),
      });
    }
  };

  // Routing checks
  // 1. Before launch date
  if (puzzleMeta.isBeforeStart && !queryParams.has('day')) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <CountdownScreen daysUntilStart={puzzleMeta.daysUntilStart} />
        </div>
      </div>
    );
  }

  // 2. Beyond last day
  const maxDayInSet = Math.max(...Object.keys(allQuestions).map(Number));
  if (dayNumber > maxDayInSet) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <EndedScreen stats={stats} onOpenStats={() => setIsStatsOpen(true)} />
          <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        </div>
      </div>
    );
  }

  const currentQ = todayQuestions[progress.currentQIndex - 1];
  const lastGuessResult = progress.guesses[progress.guesses.length - 1];

  return (
    <div className="app-shell">
      <div className="app-container">
        {/* Screen Switcher */}
        {progress.screen === 'home' && (
          <HomeScreen
            dayNumber={dayNumber}
            formattedDate={puzzleMeta.formattedDate}
            hasPlayedToday={progress.isFinished}
            onPlay={handleStartPlay}
            onSeeResults={() => updateAndSaveProgress({ ...progress, screen: 'results' })}
            onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
            onOpenStats={() => setIsStatsOpen(true)}
          />
        )}

        {progress.screen === 'question' && currentQ && (
          <QuestionScreen
            questionNumber={progress.currentQIndex}
            totalQuestions={5}
            question={currentQ}
            startTime={progress.questionStartTime || Date.now()}
            onSubmitGuess={handleProcessGuess}
            onTimeUp={handleProcessGuess}
          />
        )}

        {progress.screen === 'reveal' && lastGuessResult && (
          <RevealScreen
            dayNumber={dayNumber}
            result={lastGuessResult}
            isLastQuestion={progress.currentQIndex >= 5}
            onNext={handleNextFromReveal}
          />
        )}

        {progress.screen === 'results' && (
          <ResultsScreen
            dayNumber={dayNumber}
            guesses={progress.guesses}
            onOpenStats={() => setIsStatsOpen(true)}
            onHome={() => updateAndSaveProgress({ ...progress, screen: 'home' })}
          />
        )}

        {/* Global Modals & Install Prompts */}
        <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
        <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        <InstallPrompt />
      </div>
    </div>
  );
};
export default App;
