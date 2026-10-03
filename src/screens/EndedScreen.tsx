import React from 'react';
import { APP_NAME } from '../config';
import { PlayerStats } from '../types';

interface EndedScreenProps {
  stats: PlayerStats;
  onOpenStats: () => void;
}

export const EndedScreen: React.FC<EndedScreenProps> = ({ stats, onOpenStats }) => {
  return (
    <div className="screen-container ended-screen">
      <main className="ended-content">
        <div className="logo-container">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Ballpark Logo" className="app-logo" />
        </div>
        <h1 className="home-title">{APP_NAME}</h1>

        <div className="ended-card">
          <h2 className="ended-big-text">New questions are on the way</h2>
          <p className="ended-subtext">
            You have played through all available questions in this edition. Stay tuned for future updates!
          </p>
        </div>

        <div className="ended-stats-summary">
          <div className="metric-box">
            <span className="metric-val">{stats.gamesPlayed}</span>
            <span className="metric-lbl">Played</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">
              {stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0}
            </span>
            <span className="metric-lbl">Avg Score</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{stats.bestScore}</span>
            <span className="metric-lbl">Best Score</span>
          </div>
        </div>

        <button type="button" className="primary-button" onClick={onOpenStats}>
          View Full Stats
        </button>
      </main>
    </div>
  );
};
