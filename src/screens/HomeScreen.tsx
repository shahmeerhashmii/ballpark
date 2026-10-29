import React from 'react';
import { APP_NAME, TAGLINE } from '../config';
import { GameMode } from '../types';

interface HomeScreenProps {
  dayNumber: number;
  formattedDate: string;
  hasPlayedToday: boolean;
  hasStartedToday: boolean;
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onPlay: () => void;
  onSeeResults: () => void;
  onPractice: () => void;
  onOpenHowToPlay: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  streak: { streak: number; atRisk: boolean };
  freezes: number;
}

const MODE_COPY: Record<GameMode, string> = {
  classic: 'Type your guess. 3 swings on every question, plus a hint.',
  easy: 'Just pick the right range from 4 choices.',
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  dayNumber,
  formattedDate,
  hasPlayedToday,
  hasStartedToday,
  mode,
  onModeChange,
  onPlay,
  onSeeResults,
  onPractice,
  onOpenHowToPlay,
  onOpenStats,
  onOpenSettings,
  streak,
  freezes,
}) => {
  const modeLocked = hasPlayedToday || hasStartedToday;

  return (
    <div className="screen-container home-screen">
      <header className="home-top-bar">
        <button type="button" className="icon-button" onClick={onOpenSettings} aria-label="Settings">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button type="button" className="icon-button" onClick={onOpenStats} aria-label="View Stats">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </button>
      </header>

      <main className="home-content">
        <div className="home-hero">
          <div className="home-hero-field" aria-hidden="true">
            <svg viewBox="0 0 160 110">
              <path d="M80 104 L18 42 A88 88 0 0 1 142 42 Z" fill="var(--stadium-grass)" />
              <path d="M18 42 A88 88 0 0 1 142 42" stroke="var(--color-accent)" strokeWidth="3" fill="none" />
              <path d="M80 104 L60 84 L80 64 L100 84 Z" fill="var(--stadium-dirt)" />
              <path className="home-hero-arc" d="M80 100 Q 104 10 128 6" stroke="var(--stadium-trail)" strokeWidth="2" strokeDasharray="3 4" fill="none" />
              <circle className="home-hero-ball" cx="128" cy="6" r="5" fill="#fff" />
            </svg>
          </div>
          <h1 className="home-title">{APP_NAME}</h1>
          <p className="home-tagline">{TAGLINE}</p>
        </div>

        <div className="puzzle-meta-card">
          <span className="puzzle-number">Ballpark #{dayNumber}</span>
          <span className="puzzle-date">{formattedDate}</span>
          {(streak.streak > 0 || freezes > 0) && (
            <span className="streak-line">
              {streak.streak > 0 && (
                <span>
                  🔥 {streak.streak}-day streak{streak.atRisk && !hasPlayedToday ? ', play today to keep it' : ''}
                </span>
              )}
              {freezes > 0 && (
                <span className="freeze-chip" title="A streak freeze covers a day you miss. Earn one every 7 days in a row.">
                  🧊 {freezes} {freezes === 1 ? 'freeze' : 'freezes'}
                </span>
              )}
            </span>
          )}
        </div>

        {!hasPlayedToday && (
          <div className="mode-picker">
            <div className="mode-toggle" role="radiogroup" aria-label="Game mode">
              {(['classic', 'easy'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  className={`mode-option ${mode === m ? 'active' : ''}`}
                  onClick={() => !modeLocked && onModeChange(m)}
                  disabled={modeLocked && mode !== m}
                >
                  {m === 'classic' ? 'Classic' : 'Easy'}
                </button>
              ))}
            </div>
            <p className="mode-description">{MODE_COPY[mode]}</p>
          </div>
        )}

        <div className="home-actions">
          {hasPlayedToday ? (
            <button type="button" className="primary-button home-cta-btn" onClick={onSeeResults}>
              See today's results
            </button>
          ) : (
            <button type="button" className="primary-button home-cta-btn" onClick={onPlay}>
              {hasStartedToday ? 'Keep playing' : 'Play ball'}
            </button>
          )}

          <button type="button" className="secondary-button" onClick={onPractice}>
            Practice (unlimited, no timer)
          </button>

          <button type="button" className="text-link-button" onClick={onOpenHowToPlay}>
            How to play
          </button>
        </div>
      </main>
    </div>
  );
};
