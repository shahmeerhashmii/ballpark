import React from 'react';
import { APP_NAME, TAGLINE } from '../config';

interface HomeScreenProps {
  dayNumber: number;
  formattedDate: string;
  hasPlayedToday: boolean;
  onPlay: () => void;
  onSeeResults: () => void;
  onOpenHowToPlay: () => void;
  onOpenStats: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  dayNumber,
  formattedDate,
  hasPlayedToday,
  onPlay,
  onSeeResults,
  onOpenHowToPlay,
  onOpenStats,
}) => {
  return (
    <div className="screen-container home-screen">
      <header className="home-top-bar">
        <button
          type="button"
          className="icon-button"
          onClick={onOpenStats}
          aria-label="View Stats"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </button>
      </header>

      <main className="home-content">
        <div className="home-hero">
          <div className="logo-container">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Ballpark Logo" className="app-logo" />
          </div>
          <h1 className="home-title">{APP_NAME}</h1>
          <p className="home-tagline">{TAGLINE}</p>
        </div>

        <div className="puzzle-meta-card">
          <span className="puzzle-number">Ballpark #{dayNumber}</span>
          <span className="puzzle-date">{formattedDate}</span>
        </div>

        <div className="home-actions">
          {hasPlayedToday ? (
            <button
              type="button"
              className="primary-button home-cta-btn"
              onClick={onSeeResults}
            >
              See Today's Results
            </button>
          ) : (
            <button
              type="button"
              className="primary-button home-cta-btn"
              onClick={onPlay}
            >
              Play
            </button>
          )}

          <button
            type="button"
            className="text-link-button"
            onClick={onOpenHowToPlay}
          >
            How to play
          </button>
        </div>
      </main>
    </div>
  );
};
