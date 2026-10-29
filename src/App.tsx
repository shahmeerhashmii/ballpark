import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import questionsData from './data/questions.json';
import { QuestionsByDay } from '../scripts/build-questions';
import { DayProgress, QuestionGuessResult, PlayerStats, QueuedGuess, GameMode, QuestionItem, SwingAttempt } from './types';
import { getCurrentPuzzleDay, decodeAnswer } from './lib/daily';
import {
  getOrCreatePlayerId,
  getHasSeenHowToPlay,
  setHasSeenHowToPlay,
  getDayProgress,
  saveDayProgress,
  getPlayerStats,
  updateStatsOnGameComplete,
  resetLocalData,
  getPreferredMode,
  setPreferredMode,
  liveStreak,
} from './lib/storage';
import { submitGuessToSupabase, syncQueuedGuesses, syncQueuedReports } from './lib/supabase';
import { getSettings, saveSettings, Settings, applyTheme } from './lib/settings';
import { localizeAnswer } from './lib/units';
import { setSoundEnabled } from './lib/sound';
import { updateReminderMeta } from './lib/reminders';
import { SettingsSheet } from './components/SettingsSheet';
import { getEasyOutcome } from './lib/scoring';
import { sprayAngleFor, formatFeet } from './lib/game';
import { QUESTIONS_PER_DAY } from './config';

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
const maxDayInSet = Math.max(...Object.keys(allQuestions).map(Number));
const IS_DEMO = import.meta.env.VITE_DEMO === 'true';

function freshProgress(dayNumber: number, mode: GameMode): DayProgress {
  return {
    dayNumber,
    mode,
    currentQIndex: 1,
    screen: 'home',
    guesses: [],
    questionStartTime: null,
    currentSwings: [],
    currentHintUsed: false,
    isFinished: false,
  };
}

interface PracticeState {
  item: QuestionItem;
  day: number;
  qIndex: number;
  answer: number;
  sprayAngle: number;
  unitFactor: number;
  result: QuestionGuessResult | null;
  played: number;
  totalFeet: number;
  seen: string[];
}

function pickPracticeQuestion(currentDay: number, seen: string[]): { item: QuestionItem; day: number; qIndex: number } {
  // Only past days, so practice never spoils today's or future questions
  const lastDay = Math.max(1, Math.min(currentDay - 1, maxDayInSet));
  const pool: { item: QuestionItem; day: number; qIndex: number }[] = [];
  for (let d = 1; d <= lastDay; d++) {
    (allQuestions[d] || []).forEach((item, i) => {
      if (d === currentDay && currentDay > 1) return;
      pool.push({ item, day: d, qIndex: i + 1 });
    });
  }
  const unseen = pool.filter((p) => !seen.includes(`${p.day}-${p.qIndex}`));
  const from = unseen.length > 0 ? unseen : pool;
  return from[Math.floor(Math.random() * from.length)];
}

export const App: React.FC = () => {
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const devTools = import.meta.env.DEV || IS_DEMO;

  useEffect(() => {
    if (devTools && queryParams.has('reset')) {
      resetLocalData();
    }
  }, [queryParams, devTools]);

  const puzzleMeta = getCurrentPuzzleDay();
  const [dayNumber, setDayNumber] = useState<number>(() => {
    if (devTools && queryParams.has('day')) {
      const paramDay = parseInt(queryParams.get('day') || '1', 10);
      if (!isNaN(paramDay)) return paramDay;
    }
    return puzzleMeta.dayNumber;
  });

  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const [stats, setStats] = useState<PlayerStats>(getPlayerStats);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [preferredMode, setPreferredModeState] = useState<GameMode>(getPreferredMode);
  const [practice, setPractice] = useState<PracticeState | null>(null);
  const [settings, setSettingsState] = useState<Settings>(getSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const updateSettings = useCallback((next: Settings) => {
    setSettingsState(next);
    saveSettings(next);
  }, []);

  useEffect(() => {
    setSoundEnabled(settings.sound);
  }, [settings.sound]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    syncQueuedGuesses();
    syncQueuedReports();
    const handleOnline = () => {
      syncQueuedGuesses();
      syncQueuedReports();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (!getHasSeenHowToPlay()) {
      setIsHowToPlayOpen(true);
      setHasSeenHowToPlay(true);
    }
  }, []);

  const todayQuestions = allQuestions[dayNumber] || [];

  const [progress, setProgress] = useState<DayProgress>(
    () => getDayProgress(dayNumber) ?? freshProgress(dayNumber, preferredMode)
  );

  // Demo day switcher reloads that day's saved progress
  const loadedDay = useRef(dayNumber);
  useEffect(() => {
    if (loadedDay.current === dayNumber) return;
    loadedDay.current = dayNumber;
    setProgress(getDayProgress(dayNumber) ?? freshProgress(dayNumber, getPreferredMode()));
    setPractice(null);
  }, [dayNumber]);

  const updateAndSaveProgress = useCallback((next: DayProgress) => {
    setProgress(next);
    saveDayProgress(next);
  }, []);

  // Latest progress, so callbacks from child screens never act on a stale copy
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const handleModeChange = (mode: GameMode) => {
    setPreferredModeState(mode);
    setPreferredMode(mode);
    if (!progress.isFinished && progress.guesses.length === 0 && !progress.questionStartTime) {
      setProgress({ ...progress, mode });
    }
  };

  const handleStartPlay = () => {
    const existing = getDayProgress(dayNumber);
    if (existing && existing.isFinished) {
      updateAndSaveProgress({ ...existing, screen: 'results' });
      return;
    }
    if (existing && (existing.guesses.length > 0 || existing.questionStartTime)) {
      updateAndSaveProgress({
        ...existing,
        screen: existing.screen === 'home' ? 'question' : existing.screen,
        questionStartTime: existing.questionStartTime ?? Date.now(),
      });
      return;
    }
    updateAndSaveProgress({
      ...freshProgress(dayNumber, preferredMode),
      screen: 'question',
      questionStartTime: Date.now(),
    });
  };

  const handleSwingsChange = useCallback(
    (swings: SwingAttempt[], hintUsed: boolean, swingStartedAt?: number) => {
      const next = {
        ...progressRef.current,
        currentSwings: swings,
        currentHintUsed: hintUsed,
        // the clock restarts for every swing; saving it means a refresh doesn't cut the swing short
        ...(swingStartedAt !== undefined ? { questionStartTime: swingStartedAt } : {}),
      };
      progressRef.current = next;
      updateAndSaveProgress(next);
    },
    [updateAndSaveProgress]
  );

  const handleQuestionComplete = useCallback(
    (result: QuestionGuessResult) => {
      const prev = progressRef.current;
      if (prev.guesses.some((g) => g.qIndex === result.qIndex)) return;
      const newGuesses = [...prev.guesses, result];

      // Community stats are kept in the sheet's units, so imperial guesses are converted back
      const storedGuess = result.guess / (result.unitFactor || 1);
      const queuedItem: QueuedGuess = {
        player_id: playerId,
        puzzle_day: dayNumber,
        q_index: result.qIndex,
        guess: storedGuess > 0 ? storedGuess : 0.0001,
        feet: result.feet,
        mode: result.mode ?? 'classic',
      };
      // Every pick is saved (so the reminder knows you played); the community numbers only count classic
      submitGuessToSupabase(queuedItem);

      const isLast = result.qIndex >= QUESTIONS_PER_DAY;
      const next: DayProgress = {
        ...prev,
        guesses: newGuesses,
        screen: 'reveal',
        questionStartTime: null,
        currentSwings: [],
        currentHintUsed: false,
        isFinished: isLast,
      };
      progressRef.current = next;
      updateAndSaveProgress(next);

      if (isLast) {
        const totalFeet = newGuesses.reduce((acc, g) => acc + g.feet, 0);
        const homers = newGuesses.filter((g) => g.tier === 'park').length;
        const easyRight = newGuesses.filter((g) => getEasyOutcome(g.points).key === 'right').length;
        setStats(
          updateStatsOnGameComplete(dayNumber, { mode: prev.mode ?? 'classic', totalFeet, homeRuns: homers, easyRight })
        );
        // lets the reminder skip today on phones without the push server
        void updateReminderMeta({ lastPlayedDay: dayNumber });
      }
    },
    [playerId, dayNumber, updateAndSaveProgress]
  );

  const handleNextFromReveal = () => {
    if (progress.currentQIndex >= QUESTIONS_PER_DAY) {
      updateAndSaveProgress({ ...progress, screen: 'results' });
    } else {
      updateAndSaveProgress({
        ...progress,
        currentQIndex: progress.currentQIndex + 1,
        screen: 'question',
        questionStartTime: Date.now(),
      });
    }
  };

  // ---------- Practice ----------
  const startPractice = (prev?: PracticeState) => {
    const seen = prev?.seen ?? [];
    const pick = pickPracticeQuestion(dayNumber, seen);
    if (!pick) return;
    const loc = localizeAnswer(pick.item.question, decodeAnswer(pick.item.answer), pick.item.unit, settings.units);
    setPractice({
      item: { ...pick.item, unit: loc.unit },
      unitFactor: loc.factor,
      day: pick.day,
      qIndex: pick.qIndex,
      answer: loc.answer,
      sprayAngle: Math.round((Math.random() * 2 - 1) * 34),
      result: null,
      played: prev?.played ?? 0,
      totalFeet: prev?.totalFeet ?? 0,
      seen: [...seen, `${pick.day}-${pick.qIndex}`],
    });
  };

  const handlePracticeComplete = useCallback((result: QuestionGuessResult) => {
    setPractice((p) =>
      p && !p.result ? { ...p, result, played: p.played + 1, totalFeet: p.totalFeet + result.feet } : p
    );
  }, []);

  const exitPractice = () => setPractice(null);

  // ---------- Routing ----------
  if (puzzleMeta.isBeforeStart && !(devTools && queryParams.has('day'))) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <CountdownScreen daysUntilStart={puzzleMeta.daysUntilStart} />
        </div>
      </div>
    );
  }

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

  let screen: React.ReactNode = null;

  if (practice) {
    const label = `Practice · ${practice.played} played · ${formatFeet(practice.totalFeet)}`;
    screen = practice.result ? (
      <RevealScreen
        key={`pr-${practice.seen.length}`}
        dayNumber={null}
        reportDay={practice.day}
        playerId={playerId}
        result={practice.result}
        nextLabel="Next question"
        onNext={() => startPractice(practice)}
        secondaryLabel="Done practising"
        onSecondary={exitPractice}
      />
    ) : (
      <QuestionScreen
        key={`pq-${practice.seen.length}`}
        label={label}
        question={practice.item}
        qIndex={practice.qIndex}
        dayNumber={practice.day}
        answer={practice.answer}
        unitFactor={practice.unitFactor}
        mode="classic"
        sprayAngle={practice.sprayAngle}
        startTime={null}
        initialSwings={[]}
        initialHintUsed={false}
        onComplete={handlePracticeComplete}
        onExit={exitPractice}
      />
    );
  } else if (progress.screen === 'home') {
    screen = (
      <HomeScreen
        dayNumber={dayNumber}
        formattedDate={puzzleMeta.formattedDate}
        hasPlayedToday={progress.isFinished}
        hasStartedToday={progress.guesses.length > 0 || !!progress.questionStartTime}
        mode={progress.guesses.length > 0 || progress.questionStartTime ? progress.mode : preferredMode}
        onModeChange={handleModeChange}
        onPlay={handleStartPlay}
        onSeeResults={() => updateAndSaveProgress({ ...progress, screen: 'results' })}
        onPractice={() => startPractice()}
        onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        streak={liveStreak(stats, dayNumber)}
        freezes={stats.freezes}
      />
    );
  } else if (progress.screen === 'question' && currentQ) {
    const loc = localizeAnswer(currentQ.question, decodeAnswer(currentQ.answer), currentQ.unit, settings.units);
    screen = (
      <QuestionScreen
        key={`q-${dayNumber}-${progress.currentQIndex}`}
        label={`Question ${progress.currentQIndex} of ${QUESTIONS_PER_DAY}`}
        question={{ ...currentQ, unit: loc.unit }}
        qIndex={progress.currentQIndex}
        dayNumber={dayNumber}
        answer={loc.answer}
        unitFactor={loc.factor}
        mode={progress.mode ?? 'classic'}
        sprayAngle={sprayAngleFor(dayNumber, progress.currentQIndex)}
        startTime={progress.questionStartTime || Date.now()}
        initialSwings={progress.currentSwings ?? []}
        initialHintUsed={progress.currentHintUsed ?? false}
        onSwingsChange={handleSwingsChange}
        onComplete={handleQuestionComplete}
      />
    );
  } else if (progress.screen === 'reveal' && lastGuessResult) {
    screen = (
      <RevealScreen
        key={`r-${dayNumber}-${lastGuessResult.qIndex}`}
        dayNumber={dayNumber}
        reportDay={dayNumber}
        playerId={playerId}
        result={lastGuessResult}
        nextLabel={progress.currentQIndex >= QUESTIONS_PER_DAY ? 'See my results' : 'Next question'}
        onNext={handleNextFromReveal}
      />
    );
  } else if (progress.screen === 'results') {
    screen = (
      <ResultsScreen
        dayNumber={dayNumber}
        mode={progress.mode ?? 'classic'}
        guesses={progress.guesses}
        onOpenStats={() => setIsStatsOpen(true)}
        onHome={() => updateAndSaveProgress({ ...progress, screen: 'home' })}
        onPractice={() => startPractice()}
        freezeNote={
          stats.lastFreezeUsedOn === dayNumber
            ? `Streak saved! ${stats.lastFreezeCount === 1 ? 'A streak freeze' : `${stats.lastFreezeCount} streak freezes`} covered the day${stats.lastFreezeCount === 1 ? '' : 's'} you missed.`
            : null
        }
        streak={stats.lastPlayedDay === dayNumber ? stats.currentStreak : 0}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        {screen}

        {IS_DEMO && !practice && progress.screen === 'home' && (
          <div className="demo-bar">
            <span>Demo</span>
            <label>
              Day
              <select value={dayNumber} onChange={(e) => setDayNumber(Number(e.target.value))}>
                {Array.from({ length: maxDayInSet }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                resetLocalData();
                setStats(getPlayerStats());
                setProgress(freshProgress(dayNumber, preferredMode));
              }}
            >
              Reset
            </button>
          </div>
        )}

        <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
        <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        <SettingsSheet
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onChange={updateSettings}
          playerId={playerId}
        />
        {!IS_DEMO && <InstallPrompt />}
      </div>
    </div>
  );
};
export default App;
