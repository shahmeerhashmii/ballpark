import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { QuestionGuessResult } from '../types';
import { fetchQuestionStats, QuestionStatsData } from '../lib/supabase';
import { Stadium } from '../components/Stadium';
import { TIERS, getTier, getTierByKey, HitTier, getEasyOutcome, accuracyPoints, pointsToFeet, seededRandom } from '../lib/scoring';
import { formatNumber, formatRange } from '../lib/game';
import { playCrack, playWhiff, playCrowd, playPop } from '../lib/sound';
import { ReportSheet } from '../components/ReportSheet';

const IS_DEMO = import.meta.env.VITE_DEMO === 'true';

interface RevealScreenProps {
  dayNumber: number | null; // null in practice (no community stats)
  reportDay: number; // the puzzle day the question came from, for reports
  playerId: string;
  result: QuestionGuessResult;
  nextLabel: string;
  onNext: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export const RevealScreen: React.FC<RevealScreenProps> = ({
  dayNumber,
  reportDay,
  playerId,
  result,
  nextLabel,
  onNext,
  secondaryLabel,
  onSecondary,
}) => {
  const [landed, setLanded] = useState<boolean>(false);
  const [displayedFeet, setDisplayedFeet] = useState<number>(0);
  const [statsData, setStatsData] = useState<QuestionStatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(dayNumber !== null);
  const isEasy = result.mode === 'easy';
  const easy = isEasy ? getEasyOutcome(result.points) : null;
  const tier = getTierByKey(result.tier);
  // Easy mode has its own scale, so the ball, colour and label come from the outcome, not feet
  const shownColor = easy ? easy.color : tier.color;
  const shownLabel = easy ? (result.guess > 0 ? easy.label : result.bandLabel) : result.bandLabel;
  const flightFeet = easy ? easy.visualFeet : result.feet;
  const flightTier = easy ? easy.tier : result.tier;
  const celebrate = easy ? easy.key === 'right' : result.tier === 'park';
  const [reportOpen, setReportOpen] = useState<boolean>(false);

  // Sound: bat crack (or a whiff) as the ball leaves, then the crowd when it lands
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (flightFeet <= 0) playWhiff();
      else playCrack(flightFeet / 450);
    }, 250);
    return () => window.clearTimeout(t);
  }, [flightFeet]);

  const reactionSound = useCallback(() => {
    if (easy) {
      if (easy.key === 'right') playCrowd(0.6);
      else if (easy.key === 'close') playPop();
      return;
    }
    if (result.tier === 'park') playCrowd(1);
    else if (result.tier === 'deep') playCrowd(0.45);
    else if (result.tier === 'solid' || result.tier === 'play') playCrowd(0.12);
    else if (result.tier === 'caught') playPop();
  }, [easy, result.tier]);

  const handleLanded = useCallback(() => {
    setLanded(true);
    reactionSound();
    if (celebrate) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) {
        try {
          confetti({
            particleCount: isEasy ? 45 : 90,
            spread: 70,
            startVelocity: 38,
            origin: { y: 0.25 },
            colors: ['#C6F432', '#F5F5F0', '#F2C14E'],
            disableForReducedMotion: true,
          });
        } catch {
          // confetti is a nice to have
        }
      }
      try {
        navigator.vibrate?.([30, 40, 60]);
      } catch {
        // ignore
      }
    }
  }, [celebrate, isEasy, reactionSound]);

  // Distance counter runs while the ball is in the air
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || result.feet === 0 || isEasy) {
      setDisplayedFeet(result.feet);
      return;
    }
    const duration = 1100 + result.feet * 1.6;
    const start = performance.now() + 250;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.max(0, Math.min((now - start) / duration, 1));
      setDisplayedFeet(Math.round(result.feet * (1 - Math.pow(1 - p, 2))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result.feet, isEasy]);

  useEffect(() => {
    if (dayNumber === null || isEasy) return;
    let isMounted = true;
    fetchQuestionStats(dayNumber, result.qIndex)
      .then((data) => {
        if (isMounted) {
          setStatsData(data);
          setLoadingStats(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingStats(false);
      });
    return () => {
      isMounted = false;
    };
  }, [dayNumber, result.qIndex, isEasy]);

  // Share of players who hit it shorter than you
  let beatPercentage: number | null = null;
  if (statsData && statsData.total_count > 0) {
    const myRank = TIERS.findIndex((t) => t.key === result.tier);
    let worse = 0;
    TIERS.forEach((t, i) => {
      if (i > myRank) worse += statsData.tiers[t.key as HitTier] ?? 0;
    });
    beatPercentage = Math.round((worse / statsData.total_count) * 100);
  }

  // Ghost ball: where the median player's guess would have landed.
  // Community guesses are stored in the sheet's units, so the answer is converted back to match.
  const ghost = useMemo(() => {
    if (isEasy) return null;
    const factor = result.unitFactor || 1;
    const storedAnswer = result.answer / factor;
    let median: number | null = statsData?.median_guess ?? null;
    let label = 'Avg';
    if (median === null && IS_DEMO) {
      // Demo only: there's no live crowd here, so draw a sample one, clearly labelled
      const r = seededRandom((dayNumber ?? reportDay) * 101 + result.qIndex * 7)();
      median = storedAnswer * (0.45 + r * 1.9);
      label = 'Avg (demo)';
    }
    if (median === null || !(median > 0)) return null;
    const feet = pointsToFeet(accuracyPoints(median, storedAnswer));
    const angle = result.sprayAngle + (result.sprayAngle > 0 ? -17 : 17);
    return { feet, angle, label, medianShown: median * factor };
  }, [isEasy, result, statsData, dayNumber, reportDay]);

  const swingsUsed = result.swings.filter((s) => s.guess > 0).length;
  const guessText =
    result.mode === 'easy'
      ? result.pickedRange
        ? formatRange(result.pickedRange)
        : 'No pick'
      : result.guess > 0
        ? `${formatNumber(result.guess)} ${result.unit}`
        : 'No swing';

  return (
    <div className="screen-container reveal-screen">
      <main className="reveal-main-content">
        <div className="reveal-stadium-wrap">
          <Stadium
            variant="flight"
            hits={[{ feet: flightFeet, angle: result.sprayAngle, tier: flightTier, color: easy?.color }]}
            onLanded={handleLanded}
            ghost={ghost}
          />
          <div className="reveal-scoreboard" aria-live="polite">
            {easy ? (
              <span className="reveal-easy-badge">Easy mode</span>
            ) : (
              <span className="reveal-feet" style={{ color: landed ? tier.color : undefined }}>
                {displayedFeet} <small>ft</small>
              </span>
            )}
            <span className={`reveal-tier ${landed ? 'show' : ''}`} style={{ backgroundColor: shownColor }}>
              {shownLabel}
            </span>
          </div>
        </div>

        <div className="reveal-question-context">
          <span className="question-category-tag">{result.category}</span>
          <p className="reveal-question-text">{result.question}</p>
        </div>

        <div className="reveal-answer-box">
          <span className="reveal-answer-label">Answer</span>
          <div className="reveal-answer-number">
            {formatNumber(result.answer)}
            <span className="reveal-answer-unit"> {result.unit}</span>
          </div>
        </div>

        <div className="reveal-result-breakdown" style={{ borderColor: shownColor }}>
          <div className="guess-row">
            <span className="guess-label">{result.mode === 'easy' ? 'Your pick' : 'Your best swing'}</span>
            <span className="guess-value">{guessText}</span>
          </div>
          {result.mode === 'classic' && (swingsUsed > 1 || result.hintUsed) && (
            <div className="swing-history">
              {result.swings
                .filter((s) => s.guess > 0)
                .map((s, i) => (
                  <span key={i} className="swing-history-chip" style={{ borderColor: getTier(s.points).color }}>
                    {i + 1}. {formatNumber(s.guess)}
                  </span>
                ))}
              {result.hintUsed && <span className="swing-history-chip">💡 hint</span>}
            </div>
          )}
          {ghost && landed && (
            <div className="ghost-row">
              <span className="ghost-dot" aria-hidden="true" />
              <span>
                Average player guessed {formatNumber(ghost.medianShown)} {result.unit}, which went{' '}
                <strong>{ghost.feet} ft</strong>
                {ghost.label.includes('demo') ? ' (sample for the demo)' : ''}
              </span>
            </div>
          )}
        </div>

        {dayNumber !== null && !isEasy && (
          <div className="community-stats-card">
            <h3 className="community-title">How everyone hit it</h3>
            {loadingStats ? (
              <div className="stats-fallback-text">Loading the crowd...</div>
            ) : statsData && statsData.total_count > 0 ? (
              <div className="community-stats-body">
                {beatPercentage !== null && (
                  <div className="beat-percentage-text">
                    You hit it further than <strong>{beatPercentage}%</strong> of players
                  </div>
                )}
                {statsData.median_guess !== null && (
                  <div className="median-guess-text">
                    Median guess: <strong>{formatNumber(statsData.median_guess * (result.unitFactor || 1))} {result.unit}</strong>
                  </div>
                )}
                <div className="distribution-bars">
                  {TIERS.map((t) => {
                    const count = statsData.tiers[t.key] || 0;
                    const pct = Math.round((count / statsData.total_count) * 100);
                    const mine = t.key === result.tier;
                    return (
                      <div key={t.key} className={`dist-bar-row ${mine ? 'player-row' : ''}`}>
                        <span className="dist-bar-label">{t.short}</span>
                        <div className="dist-bar-track">
                          <div className={`dist-bar-fill ${mine ? 'active-fill' : ''}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="dist-bar-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="stats-fallback-text">Everyone's results show up when you're online</div>
            )}
          </div>
        )}
        <button type="button" className="report-link" onClick={() => setReportOpen(true)}>
          Something wrong with this answer? Report it
        </button>
      </main>

      <ReportSheet
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        playerId={playerId}
        puzzleDay={reportDay}
        qIndex={result.qIndex}
        question={result.question}
        shownAnswer={`${formatNumber(result.answer)} ${result.unit}`}
      />

      <footer className="reveal-footer">
        <button type="button" className="primary-button" onClick={onNext}>
          {nextLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button type="button" className="text-link-button reveal-secondary" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
      </footer>
    </div>
  );
};
