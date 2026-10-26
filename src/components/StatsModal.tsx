import React from 'react';
import { BottomSheet } from './BottomSheet';
import { PlayerStats } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  const avgFeet = stats.classicGames > 0 ? Math.round(stats.totalFeet / stats.classicGames) : 0;
  const easyAvg = stats.easyGames > 0 ? (stats.easyRight / stats.easyGames).toFixed(1) : '0';

  const distribution = [
    { label: 'Out of the park (2,000+)', count: stats.scoreDistribution.bullseye },
    { label: 'In the ballpark (1,550+)', count: stats.scoreDistribution.ballpark },
    { label: 'Parking lot (1,100+)', count: stats.scoreDistribution.parkingLot },
    { label: 'Wrong stadium (650+)', count: stats.scoreDistribution.wrongStadium },
    { label: 'Different sport', count: stats.scoreDistribution.differentSport },
  ];

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Statistics">
      <div className="stats-sheet-content">
        <div className="stats-metrics-grid">
          <div className="metric-box">
            <span className="metric-val">{stats.gamesPlayed}</span>
            <span className="metric-lbl">Played</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{avgFeet.toLocaleString('en-US')}</span>
            <span className="metric-lbl">Avg ft</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{stats.bestFeet.toLocaleString('en-US')}</span>
            <span className="metric-lbl">Best ft</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{stats.homeRuns}</span>
            <span className="metric-lbl">Out of the park</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{stats.currentStreak}</span>
            <span className="metric-lbl">Streak</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">{stats.longestStreak}</span>
            <span className="metric-lbl">Max streak</span>
          </div>
        </div>

        <div className="easy-stats-row">
          <span>🧊 {stats.freezes} streak {stats.freezes === 1 ? 'freeze' : 'freezes'} saved up</span>
          <span>· earn one every 7 days in a row (hold up to 2)</span>
        </div>

        {stats.easyGames > 0 && (
          <div className="easy-stats-row">
            <span className="easy-score-badge">Easy mode</span>
            <span>
              {stats.easyGames} played · {easyAvg} of 5 right on average · {stats.easyPerfect} perfect
            </span>
          </div>
        )}

        <div className="score-distribution-section">
          <h3 className="section-subheading">Classic daily totals</h3>
          <div className="dist-chart">
            {distribution.map((item, idx) => {
              const widthPct = Math.max(Math.round((item.count / maxCount) * 100), item.count > 0 ? 8 : 4);
              return (
                <div key={idx} className="dist-chart-row">
                  <span className="dist-chart-label">{item.label}</span>
                  <div className="dist-chart-track">
                    <div className="dist-chart-fill" style={{ width: `${widthPct}%` }}>
                      <span className="dist-chart-val">{item.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" className="primary-button" style={{ marginTop: '24px' }} onClick={onClose}>
          Close
        </button>
      </div>
    </BottomSheet>
  );
};
