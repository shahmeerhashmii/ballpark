import React from 'react';
import { BottomSheet } from './BottomSheet';
import { PlayerStats } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  const avgScore = stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;

  const distribution = [
    { label: 'Bullseye (450+)', count: stats.scoreDistribution.bullseye },
    { label: 'Ballpark (350-449)', count: stats.scoreDistribution.ballpark },
    { label: 'Parking lot (250-349)', count: stats.scoreDistribution.parkingLot },
    { label: 'Wrong stadium (150-249)', count: stats.scoreDistribution.wrongStadium },
    { label: 'Different sport (<150)', count: stats.scoreDistribution.differentSport },
  ];

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Statistics">
      <div className="stats-sheet-content">
        {/* Key Metrics Grid */}
        <div className="stats-metrics-grid">
          <div className="metric-box">
            <span className="metric-val">{stats.gamesPlayed}</span>
            <span className="metric-lbl">Played</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{avgScore}</span>
            <span className="metric-lbl">Avg Score</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{stats.bestScore}</span>
            <span className="metric-lbl">Best Score</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{stats.currentStreak}</span>
            <span className="metric-lbl">Streak</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{stats.longestStreak}</span>
            <span className="metric-lbl">Max Streak</span>
          </div>
        </div>

        {/* Score Distribution Chart */}
        <div className="score-distribution-section">
          <h3 className="section-subheading">Score Distribution</h3>
          <div className="dist-chart">
            {distribution.map((item, idx) => {
              const widthPct = Math.max(Math.round((item.count / maxCount) * 100), item.count > 0 ? 8 : 4);
              return (
                <div key={idx} className="dist-chart-row">
                  <span className="dist-chart-label">{item.label}</span>
                  <div className="dist-chart-track">
                    <div
                      className="dist-chart-fill"
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="dist-chart-val">{item.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          style={{ marginTop: '24px' }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </BottomSheet>
  );
};
