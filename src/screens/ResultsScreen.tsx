import React, { useState, useEffect } from 'react';
import { QuestionGuessResult } from '../types';
import { getRating, getTileColor, getTileEmoji } from '../lib/scoring';
import { formatTimeRemaining, getSecondsUntilMidnightToronto } from '../lib/daily';
import { fetchDayAverage } from '../lib/supabase';
import { REPO_URL } from '../config';

interface ResultsScreenProps {
  dayNumber: number;
  guesses: QuestionGuessResult[];
  onOpenStats: () => void;
  onHome: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  dayNumber,
  guesses,
  onOpenStats,
  onHome,
}) => {
  const totalScore = guesses.reduce((acc, g) => acc + g.points, 0);
  const ratingInfo = getRating(totalScore);

  const [displayedScore, setDisplayedScore] = useState<number>(0);
  const [dotAnimated, setDotAnimated] = useState<boolean>(false);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [dayAverage, setDayAverage] = useState<number | null>(null);
  const [secondsUntilMidnight, setSecondsUntilMidnight] = useState<number>(getSecondsUntilMidnightToronto());
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Score count-up animation
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayedScore(totalScore);
      setDotAnimated(true);
      return;
    }

    const duration = 800;
    const startTime = performance.now();

    const updateScore = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(Math.round(totalScore * eased));

      if (progress < 1) {
        requestAnimationFrame(updateScore);
      } else {
        setDisplayedScore(totalScore);
        setDotAnimated(true);
      }
    };

    requestAnimationFrame(updateScore);
  }, [totalScore]);

  // Fetch day average
  useEffect(() => {
    let isMounted = true;
    fetchDayAverage(dayNumber).then((avg) => {
      if (isMounted) setDayAverage(avg);
    });
    return () => {
      isMounted = false;
    };
  }, [dayNumber]);

  // Countdown to midnight Toronto
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsUntilMidnight(getSecondsUntilMidnightToronto());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = async () => {
    const emojiTiles = guesses.map((g) => getTileEmoji(g.points)).join('');
    const shareText = `Ballpark #${dayNumber}\n${emojiTiles} ${totalScore}/500\n${REPO_URL}`;

    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      // Clipboard failed
    }
  };

  // Target coordinates
  // Dead center is (256, 256). Radius of target is 104.
  // Distance from center is ratingInfo.targetDistance.
  // We place the dot at angle 45 degrees for dynamic look: x = 256 + dist*cos(45), y = 256 - dist*sin(45)
  const angle = Math.PI / 4;
  const targetX = 256 + ratingInfo.targetDistance * Math.cos(angle);
  const targetY = 256 - ratingInfo.targetDistance * Math.sin(angle);

  return (
    <div className="screen-container results-screen">
      {/* Top Header */}
      <header className="results-header">
        <button type="button" className="icon-button" onClick={onHome} aria-label="Home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        <span className="results-top-title">Ballpark #{dayNumber}</span>
        <button type="button" className="icon-button" onClick={onOpenStats} aria-label="Stats">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </button>
      </header>

      <main className="results-main-content">
        {/* Animated Target Graphic (Rings only, no stem) */}
        <div className="target-graphic-wrapper">
          <svg width="180" height="180" viewBox="0 0 512 512" className="target-svg">
            {/* Outer ring */}
            <circle cx="256" cy="256" r="140" fill="none" stroke="var(--color-raised-surface)" strokeWidth="36" />
            {/* Middle ring */}
            <circle cx="256" cy="256" r="75" fill="none" stroke="var(--color-raised-surface)" strokeWidth="28" />
            {/* Bullseye center ring */}
            <circle cx="256" cy="256" r="18" fill="var(--color-raised-surface)" />

            {/* Electric Lime Landing Dot */}
            <circle
              cx={dotAnimated ? targetX : 480}
              cy={dotAnimated ? targetY : 30}
              r="24"
              fill="var(--color-accent)"
              className="target-dot-transition"
            />
          </svg>
        </div>

        {/* Score & Rating */}
        <div className="total-score-box">
          <div className="total-score-number">{displayedScore}</div>
          <div className="total-score-max">/ 500</div>
        </div>

        <div className="rating-title-pill">{ratingInfo.title}</div>

        {/* 5 Result Tiles */}
        <div className="result-tiles-row">
          {guesses.map((g, idx) => {
            const tileBg = getTileColor(g.points);
            const isSelected = selectedTileIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                className={`result-tile-btn ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: tileBg }}
                onClick={() => setSelectedTileIndex(isSelected ? null : idx)}
                aria-label={`Question ${idx + 1}: ${g.points} points`}
              >
                <span className="tile-points-num">{g.points}</span>
              </button>
            );
          })}
        </div>

        {/* Tile Details Inspector Modal / Card */}
        {selectedTileIndex !== null && (
          <div className="tile-inspector-card">
            <div className="tile-inspector-header">
              <span className="inspector-q-label">Q{selectedTileIndex + 1}: {guesses[selectedTileIndex].category}</span>
              <button
                type="button"
                className="inspector-close-btn"
                onClick={() => setSelectedTileIndex(null)}
              >
                ✕
              </button>
            </div>
            <p className="inspector-q-text">{guesses[selectedTileIndex].question}</p>
            <div className="inspector-data-grid">
              <div>
                <span className="data-dim-label">Answer</span>
                <span className="data-bold-val">
                  {guesses[selectedTileIndex].answer} {guesses[selectedTileIndex].unit}
                </span>
              </div>
              <div>
                <span className="data-dim-label">Your Guess</span>
                <span className="data-bold-val">
                  {guesses[selectedTileIndex].guess > 0
                    ? `${guesses[selectedTileIndex].guess} ${guesses[selectedTileIndex].unit}`
                    : "Time's up (0)"}
                </span>
              </div>
              <div>
                <span className="data-dim-label">Points</span>
                <span className="data-bold-val" style={{ color: getTileColor(guesses[selectedTileIndex].points) }}>
                  {guesses[selectedTileIndex].points} pts
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Community Average */}
        {dayAverage !== null && (
          <div className="community-average-line">
            Today's player average: <strong>{dayAverage} / 500</strong>
          </div>
        )}

        {/* Next Game Countdown */}
        <div className="next-countdown-card">
          <span className="next-countdown-label">Next Ballpark in</span>
          <span className="next-countdown-digits">{formatTimeRemaining(secondsUntilMidnight)}</span>
        </div>
      </main>

      {/* Share Button pinned at bottom */}
      <footer className="results-footer">
        <button type="button" className="primary-button share-btn" onClick={handleShare}>
          {copiedToast ? 'Copied to Clipboard!' : 'Share Results'}
        </button>
      </footer>
    </div>
  );
};
