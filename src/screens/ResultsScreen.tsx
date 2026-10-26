import React, { useState, useEffect, useCallback } from 'react';
import { QuestionGuessResult, GameMode } from '../types';
import { getRating, getTierByKey, getEasyOutcome, getEasyRating } from '../lib/scoring';
import { formatTimeRemaining, getSecondsUntilMidnightToronto } from '../lib/daily';
import { fetchDayAverage } from '../lib/supabase';
import { REPO_URL, MAX_FEET_PER_DAY } from '../config';
import { Stadium } from '../components/Stadium';
import { formatNumber, formatRange } from '../lib/game';
import { renderShareCard } from '../lib/shareCard';
import { ShareImageSheet } from '../components/ShareImageSheet';
import { FREEZE_EVERY } from '../lib/storage';

interface ResultsScreenProps {
  dayNumber: number;
  mode: GameMode;
  guesses: QuestionGuessResult[];
  onOpenStats: () => void;
  onHome: () => void;
  onPractice: () => void;
  freezeNote: string | null;
  streak: number;
}

export function buildShareText(dayNumber: number, mode: GameMode, guesses: QuestionGuessResult[]): string {
  const url = REPO_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (mode === 'easy') {
    const marks = guesses.map((g) => getEasyOutcome(g.points).emoji).join('');
    const right = guesses.filter((g) => getEasyOutcome(g.points).key === 'right').length;
    return `Ballpark #${dayNumber} · Easy mode ⚾\n${right}/5 right\n${marks}\n${url}`;
  }
  const totalFeet = guesses.reduce((acc, g) => acc + g.feet, 0);
  const balls = guesses.map((g) => getTierByKey(g.tier).emoji).join('');
  const homers = guesses.filter((g) => g.tier === 'park').length;
  const homerLine = homers > 0 ? ` · ${homers} ${homers === 1 ? 'homer' : 'homers'}` : '';
  return `Ballpark #${dayNumber} ⚾\n${totalFeet.toLocaleString('en-US')} ft${homerLine}\n${balls}\n${url}`;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  dayNumber,
  mode,
  guesses,
  onOpenStats,
  onHome,
  onPractice,
  freezeNote,
  streak,
}) => {
  const isEasy = mode === 'easy';
  const totalFeet = guesses.reduce((acc, g) => acc + g.feet, 0);
  const rightCount = guesses.filter((g) => getEasyOutcome(g.points).key === 'right').length;
  const ratingTitle = isEasy ? getEasyRating(rightCount) : getRating(totalFeet).title;

  const [displayedFeet, setDisplayedFeet] = useState<number>(0);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [dayAverage, setDayAverage] = useState<number | null>(null);
  const [secondsUntilMidnight, setSecondsUntilMidnight] = useState<number>(getSecondsUntilMidnightToronto());
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [imageOpen, setImageOpen] = useState<boolean>(false);
  const makeImage = useCallback(
    () =>
      renderShareCard({
        dayNumber,
        mode,
        guesses,
        ratingTitle,
        bigNumber: isEasy ? String(rightCount) : totalFeet.toLocaleString('en-US'),
        bigLabel: isEasy ? 'of 5 right' : `ft of ${MAX_FEET_PER_DAY.toLocaleString('en-US')}`,
        url: REPO_URL.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      }),
    [dayNumber, mode, guesses, ratingTitle, isEasy, rightCount, totalFeet]
  );

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplayedFeet(totalFeet);
      return;
    }
    const duration = 1200;
    const startTime = performance.now();
    let raf = 0;
    const update = (time: number) => {
      const p = Math.min((time - startTime) / duration, 1);
      setDisplayedFeet(Math.round(totalFeet * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [totalFeet]);

  useEffect(() => {
    if (isEasy) return;
    let isMounted = true;
    fetchDayAverage(dayNumber).then((avg) => {
      if (isMounted) setDayAverage(avg);
    });
    return () => {
      isMounted = false;
    };
  }, [dayNumber, isEasy]);

  useEffect(() => {
    const interval = setInterval(() => setSecondsUntilMidnight(getSecondsUntilMidnightToronto()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = async () => {
    const shareText = buildShareText(dayNumber, mode, guesses);
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      // clipboard failed
    }
  };

  const selected = selectedTileIndex !== null ? guesses[selectedTileIndex] : null;

  return (
    <div className="screen-container results-screen">
      <header className="results-header">
        <button type="button" className="icon-button" onClick={onHome} aria-label="Home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        <span className="results-top-title">
          Ballpark #{dayNumber}
          {mode === 'easy' && <span className="mode-tag">Easy</span>}
        </span>
        <button type="button" className="icon-button" onClick={onOpenStats} aria-label="Stats">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </button>
      </header>

      <main className="results-main-content">
        <Stadium
          variant="spray"
          className="results-stadium"
          hits={guesses.map((g) => {
            if (!isEasy) return { feet: g.feet, angle: g.sprayAngle, tier: g.tier };
            const o = getEasyOutcome(g.points);
            return { feet: o.visualFeet, angle: g.sprayAngle, tier: o.tier, color: o.color };
          })}
        />

        {isEasy ? (
          <div className="easy-score-block">
            <span className="easy-score-badge">Easy mode</span>
            <div className="total-score-box">
              <div className="total-score-number">{rightCount}</div>
              <div className="total-score-max">of 5 right</div>
            </div>
          </div>
        ) : (
          <div className="total-score-box">
            <div className="total-score-number">{displayedFeet.toLocaleString('en-US')}</div>
            <div className="total-score-max">ft of {MAX_FEET_PER_DAY.toLocaleString('en-US')}</div>
          </div>
        )}

        <div className="rating-title-pill">{ratingTitle}</div>

        {freezeNote && <div className="freeze-note">🧊 {freezeNote}</div>}
        {streak > 0 && (
          <div className="streak-note">
            🔥 {streak}-day streak
            {streak % FREEZE_EVERY === 0 ? ' · you earned a streak freeze!' : ` · ${FREEZE_EVERY - (streak % FREEZE_EVERY)} more for a streak freeze`}
          </div>
        )}

        <div className="result-tiles-row">
          {guesses.map((g, idx) => {
            const t = getTierByKey(g.tier);
            const isSelected = selectedTileIndex === idx;
            if (isEasy) {
              const o = getEasyOutcome(g.points);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`result-tile-btn easy ${isSelected ? 'selected' : ''}`}
                  style={{ backgroundColor: o.color }}
                  onClick={() => setSelectedTileIndex(isSelected ? null : idx)}
                  aria-label={`Question ${idx + 1}: ${o.short}`}
                >
                  <span className="tile-points-num">{o.key === 'right' ? '✓' : o.key === 'close' ? '≈' : '✗'}</span>
                </button>
              );
            }
            return (
              <button
                key={idx}
                type="button"
                className={`result-tile-btn ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: t.color }}
                onClick={() => setSelectedTileIndex(isSelected ? null : idx)}
                aria-label={`Question ${idx + 1}: ${g.feet} feet, ${t.short}`}
              >
                <span className="tile-points-num">{g.feet}</span>
                <span className="tile-ft">ft</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="tile-inspector-card">
            <div className="tile-inspector-header">
              <span className="inspector-q-label">
                Q{(selectedTileIndex ?? 0) + 1}: {selected.category}
              </span>
              <button type="button" className="inspector-close-btn" onClick={() => setSelectedTileIndex(null)}>
                ✕
              </button>
            </div>
            <p className="inspector-q-text">{selected.question}</p>
            <div className="inspector-data-grid">
              <div>
                <span className="data-dim-label">Answer</span>
                <span className="data-bold-val">
                  {formatNumber(selected.answer)} {selected.unit}
                </span>
              </div>
              <div>
                <span className="data-dim-label">{selected.mode === 'easy' ? 'Your pick' : 'Your guess'}</span>
                <span className="data-bold-val">
                  {selected.mode === 'easy'
                    ? selected.pickedRange
                      ? formatRange(selected.pickedRange)
                      : 'No pick'
                    : selected.guess > 0
                      ? `${formatNumber(selected.guess)} ${selected.unit}`
                      : 'No swing'}
                </span>
              </div>
              <div>
                <span className="data-dim-label">Result</span>
                {selected.mode === 'easy' ? (
                  <span className="data-bold-val" style={{ color: getEasyOutcome(selected.points).color }}>
                    {getEasyOutcome(selected.points).label}
                  </span>
                ) : (
                  <span className="data-bold-val" style={{ color: getTierByKey(selected.tier).color }}>
                    {selected.feet} ft, {getTierByKey(selected.tier).short}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {dayAverage !== null && !isEasy && (
          <div className="community-average-line">
            Today's player average: <strong>{dayAverage.toLocaleString('en-US')} ft</strong>
          </div>
        )}

        <div className="next-countdown-card">
          <span className="next-countdown-label">Next Ballpark in</span>
          <span className="next-countdown-digits">{formatTimeRemaining(secondsUntilMidnight)}</span>
        </div>

        <button type="button" className="secondary-button" onClick={onPractice}>
          Keep swinging in Practice
        </button>
      </main>

      <footer className="results-footer share-row">
        <button type="button" className="primary-button share-btn" onClick={handleShare}>
          {copiedToast ? 'Copied to clipboard!' : 'Share my results'}
        </button>
        <button type="button" className="share-image-btn" onClick={() => setImageOpen(true)} aria-label="Share as a picture">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <path d="M21 15l-5-5L5 21"></path>
          </svg>
          <span>Picture</span>
        </button>
      </footer>

      <ShareImageSheet
        isOpen={imageOpen}
        onClose={() => setImageOpen(false)}
        makeImage={makeImage}
        fileName={`ballpark-${dayNumber}.png`}
        shareText={buildShareText(dayNumber, mode, guesses)}
      />
    </div>
  );
};
