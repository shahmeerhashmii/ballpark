import React, { useCallback, useMemo, useRef, useState } from 'react';
import { QuestionItem, QuestionGuessResult, SwingAttempt, GameMode } from '../types';
import { Timer } from '../components/Timer';
import { Keypad, Multiplier, computeNumericValue } from '../components/Keypad';
import {
  calculateScore,
  getTier,
  getHintRange,
  buildRangeChoices,
  scoreRangePick,
  MAX_SWINGS,
  atBatOver,
  HINT_MULTIPLIER,
} from '../lib/scoring';
import { buildResult, formatNumber, formatRange, formatFeet, rangeSeedFor } from '../lib/game';
import { playFoul, playTick, unlock } from '../lib/sound';

interface QuestionScreenProps {
  label: string; // "Question 2 of 5" or "Practice"
  question: QuestionItem;
  qIndex: number;
  dayNumber: number;
  answer: number; // already in the player's units
  unitFactor?: number; // shown value = stored value x this
  mode: GameMode;
  sprayAngle: number;
  startTime: number | null; // null = no timer (practice)
  initialSwings: SwingAttempt[];
  initialHintUsed: boolean;
  // swingStartedAt: when the clock restarted for the next swing, so a refresh keeps the right time
  onSwingsChange?: (swings: SwingAttempt[], hintUsed: boolean, swingStartedAt?: number) => void;
  onComplete: (result: QuestionGuessResult) => void;
  onExit?: () => void;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({
  label,
  question,
  qIndex,
  dayNumber,
  answer,
  unitFactor = 1,
  mode,
  sprayAngle,
  startTime,
  initialSwings,
  initialHintUsed,
  onSwingsChange,
  onComplete,
  onExit,
}) => {
  const [inputString, setInputString] = useState<string>('');
  const [activeMultiplier, setActiveMultiplier] = useState<Multiplier>(null);
  const [swings, setSwings] = useState<SwingAttempt[]>(initialSwings);
  const [hintUsed, setHintUsed] = useState<boolean>(initialHintUsed);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [shakeKey, setShakeKey] = useState<number>(0);
  const doneRef = useRef(false);
  // Each swing gets its own full clock, so a slow first swing can't use up the other two
  const [swingStart, setSwingStart] = useState<number | null>(startTime);

  const numericValue = computeNumericValue(inputString, activeMultiplier);
  const hintRange = useMemo(() => getHintRange(answer), [answer]);
  const rangeChoices = useMemo(
    () => (mode === 'easy' ? buildRangeChoices(answer, rangeSeedFor(dayNumber, qIndex)) : null),
    [mode, answer, dayNumber, qIndex]
  );

  const finish = useCallback(
    (finalSwings: SwingAttempt[], extra?: { pickedRange?: { low: number; high: number }; labelOverride?: string }) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setIsDone(true);
      onComplete({
        ...buildResult({
          qIndex,
          question,
          answer,
          swings: finalSwings,
          hintUsed,
          mode,
          sprayAngle,
          pickedRange: extra?.pickedRange,
          labelOverride: extra?.labelOverride,
        }),
        unitFactor,
      });
    },
    [qIndex, question, answer, hintUsed, mode, sprayAngle, onComplete, unitFactor]
  );

  const handleSwing = () => {
    unlock();
    if (numericValue <= 0 || doneRef.current) return;
    const swingNumber = swings.length + 1;
    const score = calculateScore(numericValue, answer, { swingNumber, hintUsed });
    const attempt: SwingAttempt = { guess: numericValue, points: score.points, direction: score.direction };
    const next = [...swings, attempt];

    // Every question gets all 3 swings, even after a great hit. Only an exact guess ends it early.
    if (atBatOver(swingNumber, score.direction)) {
      finish(next);
      return;
    }

    if (score.tier !== 'park' && score.tier !== 'deep') playFoul();
    const restartedAt = startTime !== null ? Date.now() : undefined;
    if (restartedAt !== undefined) setSwingStart(restartedAt);
    setSwings(next);
    onSwingsChange?.(next, hintUsed, restartedAt);
    setInputString('');
    setActiveMultiplier(null);
    setShakeKey((k) => k + 1);
  };

  const handleTakeIt = () => {
    if (swings.length === 0) return;
    finish(swings);
  };

  const handleHint = () => {
    if (hintUsed) return;
    setHintUsed(true);
    onSwingsChange?.(swings, true);
  };

  const handlePick = (idx: number) => {
    unlock();
    if (!rangeChoices || doneRef.current) return;
    const opt = rangeChoices.options[idx];
    const mid = Math.sqrt(Math.max(opt.low, 1e-9) * opt.high);
    const score = scoreRangePick(idx, rangeChoices, answer, mid);
    finish([{ guess: mid, points: score.points, direction: score.direction }], {
      pickedRange: opt,
      labelOverride: score.bandLabel,
    });
  };

  const handleTimeUp = useCallback(() => {
    if (doneRef.current) return;
    if (mode === 'easy') {
      finish([{ guess: 0, points: 0, direction: 'low' }], { labelOverride: "Time's up" });
      return;
    }
    if (numericValue > 0) {
      const score = calculateScore(numericValue, answer, { swingNumber: swings.length + 1, hintUsed });
      finish([...swings, { guess: numericValue, points: score.points, direction: score.direction }]);
    } else if (swings.length > 0) {
      finish(swings);
    } else {
      finish([{ guess: 0, points: 0, direction: 'low' }], { labelOverride: "Time's up" });
    }
  }, [mode, numericValue, answer, swings, hintUsed, finish]);

  const handleSecond = useCallback((left: number) => {
    if (left <= 3) playTick();
  }, []);

  const lastSwing = swings[swings.length - 1];
  // a deep or out of the park swing that still has swings left: cheer it, don't treat it as a miss
  const lastGreat = !!lastSwing && (getTier(lastSwing.points).key === 'park' || getTier(lastSwing.points).key === 'deep');
  const bestSoFar = swings.reduce((m, s) => Math.max(m, s.points), 0);
  const swingsLeft = MAX_SWINGS - swings.length;

  return (
    <div className={`screen-container question-screen ${mode}`}>
      <header className="question-header">
        <div className="question-meta">
          <span className="question-progress-label">{label}</span>
          <span className="question-category-tag">{question.category}</span>
        </div>
        {startTime !== null ? (
          <Timer startTime={swingStart ?? startTime} onTimeUp={handleTimeUp} isRunning={!isDone} onSecond={handleSecond} />
        ) : (
          onExit && (
            <button type="button" className="text-link-button practice-exit" onClick={onExit}>
              Done
            </button>
          )
        )}
      </header>

      <main className="question-main-content">
        {/* The question is never covered: it sits in its own block that does not shrink,
            and everything after a swing goes inside the compact answer panel below it */}
        <div className="question-main-inner">
          <h2 className="question-text">{question.question}</h2>

          {mode === 'classic' && (
            <div className="answer-panel">
              <div className="swing-strip">
                <div className="swing-dots" aria-label={`Swing ${swings.length + 1} of ${MAX_SWINGS}`}>
                  {Array.from({ length: MAX_SWINGS }).map((_, i) => {
                    const s = swings[i];
                    return (
                      <span
                        key={i}
                        className={`swing-dot ${s ? 'used' : ''} ${i === swings.length ? 'current' : ''}`}
                        style={s ? { backgroundColor: getTier(s.points).color } : undefined}
                      />
                    );
                  })}
                  <span className="swing-count">
                    Swing {Math.min(swings.length + 1, MAX_SWINGS)} of {MAX_SWINGS}
                  </span>
                </div>
                {!hintUsed ? (
                  <button type="button" className="hint-chip" onClick={handleHint} disabled={isDone}>
                    💡 Hint
                  </button>
                ) : (
                  <span className="hint-chip used" title={`Hints cost ${Math.round((1 - HINT_MULTIPLIER) * 100)}% of your distance`}>
                    💡 {formatRange(hintRange)}
                  </span>
                )}
              </div>

              {lastSwing && (
                <div key={shakeKey} className={`swing-feedback ${lastSwing.direction} ${lastGreat ? 'great' : ''}`} role="status">
                  <span className="swing-feedback-arrow" aria-hidden="true">
                    {lastSwing.direction === 'high' ? '↓' : '↑'}
                  </span>
                  <span className="swing-feedback-text">
                    <strong>
                      {lastGreat
                        ? `${getTier(lastSwing.points).label.replace(/[^!.]$/, '$&!')} ${formatNumber(lastSwing.guess)} is a little ${lastSwing.direction === 'high' ? 'high' : 'low'}`
                        : `${formatNumber(lastSwing.guess)} is too ${lastSwing.direction === 'high' ? 'high' : 'low'}`}
                    </strong>
                    <span className="swing-feedback-sub">
                      {bestSoFar > 0
                        ? `Best: ${formatFeet(Math.round(bestSoFar * 4.5))}`
                        : 'No hit yet'}
                      {' · '}
                      {swingsLeft} {swingsLeft === 1 ? 'swing' : 'swings'} left
                    </span>
                  </span>
                  {bestSoFar > 0 && (
                    <button type="button" className="take-it-btn" onClick={handleTakeIt} disabled={isDone}>
                      Keep best
                    </button>
                  )}
                </div>
              )}

              <div className="number-display">
                <span className="unit-label-top">{question.unit}</span>
                <div className="entered-number-row">
                  <span className="entered-digits">{inputString || '0'}</span>
                  {activeMultiplier && <span className="entered-multiplier-suffix"> {activeMultiplier}</span>}
                </div>
                {activeMultiplier && numericValue > 0 && (
                  <div className="calculated-total-subtext">
                    = {formatNumber(numericValue)} {question.unit}
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'easy' && rangeChoices && (
            <div className="range-picks">
              <span className="range-picks-label">Pick the range ({question.unit})</span>
              {rangeChoices.options.map((opt, i) => (
                <button key={i} type="button" className="range-pick-btn" onClick={() => handlePick(i)} disabled={isDone}>
                  {formatRange(opt)}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {mode === 'classic' && (
        <footer className="question-footer">
          <Keypad
            inputString={inputString}
            onInputChange={setInputString}
            activeMultiplier={activeMultiplier}
            onMultiplierChange={setActiveMultiplier}
            onLockIn={handleSwing}
            disabled={isDone}
            lockInLabel={swings.length === 0 ? 'Swing' : 'Swing again'}
          />
        </footer>
      )}
    </div>
  );
};
