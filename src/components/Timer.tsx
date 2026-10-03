import React, { useEffect, useState, useRef } from 'react';
import { SECONDS_PER_QUESTION } from '../config';

interface TimerProps {
  startTime: number; // epoch ms
  onTimeUp: () => void;
  isRunning?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ startTime, onTimeUp, isRunning = true }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(SECONDS_PER_QUESTION);
  const [fractionLeft, setFractionLeft] = useState<number>(1);
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');
  const hasTriggeredTimeUp = useRef<boolean>(false);
  const hasVibrated = useRef<boolean>(false);
  const lastAnnouncedSec = useRef<number | null>(null);

  useEffect(() => {
    hasTriggeredTimeUp.current = false;
    hasVibrated.current = false;
    lastAnnouncedSec.current = null;
  }, [startTime]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTime;
      const totalMs = SECONDS_PER_QUESTION * 1000;
      const remainingMs = Math.max(0, totalMs - elapsedMs);
      const remainingSec = Math.ceil(remainingMs / 1000);
      const frac = remainingMs / totalMs;

      setSecondsLeft(remainingSec);
      setFractionLeft(frac);

      // Announce at 10, 5, 3
      if (
        (remainingSec === 10 || remainingSec === 5 || remainingSec === 3) &&
        lastAnnouncedSec.current !== remainingSec
      ) {
        lastAnnouncedSec.current = remainingSec;
        setAriaAnnouncement(`${remainingSec} seconds remaining`);
      }

      // Android vibration at 3 seconds
      if (remainingSec <= 3 && !hasVibrated.current) {
        hasVibrated.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(200);
          } catch {
            // Ignore vibration errors
          }
        }
      }

      if (remainingMs <= 0 && !hasTriggeredTimeUp.current) {
        hasTriggeredTimeUp.current = true;
        clearInterval(interval);
        onTimeUp();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [startTime, isRunning, onTimeUp]);

  // SVG ring calculations
  // radius = 22, circumference = 2 * PI * 22 = 138.23
  const radius = 22;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - fractionLeft);

  let ringColor = 'var(--color-accent)'; // Electric lime
  let isPulsing = false;

  if (secondsLeft <= 3) {
    ringColor = 'var(--color-result-red)'; // #FF5A4F
    isPulsing = true;
  } else if (secondsLeft <= 5) {
    ringColor = 'var(--color-result-yellow)'; // #F2C14E
  }

  return (
    <div className="timer-wrapper" aria-label={`Time left: ${secondsLeft} seconds`}>
      <div className={`timer-circle ${isPulsing ? 'pulse-urgent' : ''}`}>
        <svg width="100%" height="100%" viewBox="0 0 56 56" className="timer-svg">
          {/* Background track */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="transparent"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
          {/* Active draining ring */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="transparent"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 28 28)"
            style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease' }}
          />
        </svg>
        <span className="timer-seconds-text" style={{ color: ringColor }}>
          {secondsLeft}
        </span>
      </div>

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {ariaAnnouncement}
      </div>
    </div>
  );
};
