import React, { useEffect, useState } from 'react';
import { QuestionGuessResult } from '../types';
import { formatWithCommas } from '../components/Keypad';
import { fetchQuestionStats, QuestionStatsData } from '../lib/supabase';

interface RevealScreenProps {
  dayNumber: number;
  result: QuestionGuessResult;
  isLastQuestion: boolean;
  onNext: () => void;
}

export const RevealScreen: React.FC<RevealScreenProps> = ({
  dayNumber,
  result,
  isLastQuestion,
  onNext,
}) => {
  const [displayedAnswer, setDisplayedAnswer] = useState<number>(0);
  const [pointsPopped, setPointsPopped] = useState<boolean>(false);
  const [statsData, setStatsData] = useState<QuestionStatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Fast count up animation for answer (~600ms)
  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayedAnswer(result.answer);
      setPointsPopped(true);
      return;
    }

    const duration = 600;
    const startTime = performance.now();
    const target = result.answer;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = target * easedProgress;

      setDisplayedAnswer(Number(currentVal.toFixed(target % 1 === 0 ? 0 : 2)));

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayedAnswer(target);
        setTimeout(() => setPointsPopped(true), 150);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [result.answer]);

  // Fetch Supabase stats
  useEffect(() => {
    let isMounted = true;
    fetchQuestionStats(dayNumber, result.qIndex)
      .then((data) => {
        if (isMounted) {
          setStatsData(data);
          setLoadingStats(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingStats(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dayNumber, result.qIndex]);

  // Compute player's band key for highlighting in horizontal bar chart
  const getBandKey = (pts: number) => {
    if (pts === 100) return 'exact';
    if (pts === 90) return 'within_10';
    if (pts === 75) return 'within_15';
    if (pts === 60) return 'within_30';
    if (pts === 50) return 'within_40';
    if (pts === 30) return 'within_50';
    if (pts === 15) return 'within_75';
    if (pts === 10) return 'within_80';
    if (pts === 5) return 'within_90';
    if (pts === 1) return 'within_99';
    return 'more_than_99';
  };

  const playerBandKey = getBandKey(result.points);

  // Compute beat percentage if stats available
  let beatPercentage: number | null = null;
  if (statsData && statsData.total_count > 0) {
    const bands = statsData.bands;
    // Points order descending: 100, 90, 75, 60, 50, 30, 15, 10, 5, 1, 0
    let playersWorse = 0;
    const bandPointsList: { key: keyof typeof bands; pts: number }[] = [
      { key: 'exact', pts: 100 },
      { key: 'within_10', pts: 90 },
      { key: 'within_15', pts: 75 },
      { key: 'within_30', pts: 60 },
      { key: 'within_40', pts: 50 },
      { key: 'within_50', pts: 30 },
      { key: 'within_75', pts: 15 },
      { key: 'within_80', pts: 10 },
      { key: 'within_90', pts: 5 },
      { key: 'within_99', pts: 1 },
      { key: 'more_than_99', pts: 0 },
    ];

    for (const item of bandPointsList) {
      if (item.pts < result.points) {
        playersWorse += bands[item.key];
      }
    }
    beatPercentage = Math.round((playersWorse / statsData.total_count) * 100);
  }

  const formatPercentOff = () => {
    if (result.percentOff <= 0.0001) return 'Exact!';
    const pct = Math.round(result.percentOff * 100);
    return `${pct}% off`;
  };

  return (
    <div className="screen-container reveal-screen">
      <main className="reveal-main-content">
        {/* Question Title */}
        <div className="reveal-question-context">
          <span className="question-category-tag">{result.category}</span>
          <p className="reveal-question-text">{result.question}</p>
        </div>

        {/* Real Answer Reveal */}
        <div className="reveal-answer-box">
          <span className="reveal-answer-label">Correct Answer</span>
          <div className="reveal-answer-number">
            {formatWithCommas(displayedAnswer)}
            <span className="reveal-answer-unit"> {result.unit}</span>
          </div>
        </div>

        {/* Guess vs Points Breakdown */}
        <div className="reveal-result-breakdown" style={{ borderColor: result.color }}>
          <div className="guess-row">
            <span className="guess-label">Your Guess:</span>
            <span className="guess-value">
              {result.guess > 0 ? `${formatWithCommas(result.guess)} ${result.unit}` : "Time's up (0)"}
            </span>
          </div>

          <div className="result-status-row">
            <div className="band-badge" style={{ color: result.color, borderColor: result.color }}>
              {formatPercentOff()} ({result.bandLabel})
            </div>
            <div className={`points-pill ${pointsPopped ? 'popped' : ''}`} style={{ backgroundColor: result.color }}>
              +{result.points} pts
            </div>
          </div>
        </div>

        {/* Community Stats Section */}
        <div className="community-stats-card">
          <h3 className="community-title">How Everyone Did</h3>
          {loadingStats ? (
            <div className="stats-fallback-text">Loading community stats...</div>
          ) : statsData && statsData.total_count > 0 ? (
            <div className="community-stats-body">
              {beatPercentage !== null && (
                <div className="beat-percentage-text">
                  You beat <strong>{beatPercentage}%</strong> of players
                </div>
              )}
              {statsData.median_guess !== null && (
                <div className="median-guess-text">
                  Median guess: <strong>{formatWithCommas(statsData.median_guess)} {result.unit}</strong>
                </div>
              )}

              {/* Horizontal Distribution Chart */}
              <div className="distribution-bars">
                {[
                  { key: 'exact', label: 'Exact (100)' },
                  { key: 'within_10', label: '≤10% (90)' },
                  { key: 'within_15', label: '≤15% (75)' },
                  { key: 'within_30', label: '≤30% (60)' },
                  { key: 'within_40', label: '≤40% (50)' },
                  { key: 'within_50', label: '≤50% (30)' },
                  { key: 'within_75', label: '≤75% (15)' },
                  { key: 'within_80', label: '≤80% (10)' },
                  { key: 'within_90', label: '≤90% (5)' },
                  { key: 'within_99', label: '≤99% (1)' },
                  { key: 'more_than_99', label: '>99% (0)' },
                ].map((item) => {
                  const count = statsData.bands[item.key as keyof typeof statsData.bands] || 0;
                  const pct = Math.round((count / statsData.total_count) * 100);
                  const isPlayerBand = item.key === playerBandKey;
                  return (
                    <div key={item.key} className={`dist-bar-row ${isPlayerBand ? 'player-row' : ''}`}>
                      <span className="dist-bar-label">{item.label}</span>
                      <div className="dist-bar-track">
                        <div
                          className={`dist-bar-fill ${isPlayerBand ? 'active-fill' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="dist-bar-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="stats-fallback-text">
              Everyone's results show up when you're online
            </div>
          )}
        </div>
      </main>

      {/* Footer with Next Action Button */}
      <footer className="reveal-footer">
        <button type="button" className="primary-button" onClick={onNext}>
          {isLastQuestion ? 'See Results' : 'Next'}
        </button>
      </footer>
    </div>
  );
};
