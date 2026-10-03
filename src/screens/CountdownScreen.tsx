import React from 'react';
import { APP_NAME, TAGLINE } from '../config';

interface CountdownScreenProps {
  daysUntilStart: number;
}

export const CountdownScreen: React.FC<CountdownScreenProps> = ({ daysUntilStart }) => {
  return (
    <div className="screen-container countdown-screen">
      <main className="countdown-content">
        <div className="logo-container">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Ballpark Logo" className="app-logo" />
        </div>
        <h1 className="home-title">{APP_NAME}</h1>
        <p className="home-tagline">{TAGLINE}</p>

        <div className="countdown-card">
          <span className="countdown-label">Launching Soon</span>
          <h2 className="countdown-big-text">
            First game in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
          </h2>
          <p className="countdown-subtext">
            Get your ballpark estimates ready. Five daily questions starting October 5, 2026.
          </p>
        </div>
      </main>
    </div>
  );
};
