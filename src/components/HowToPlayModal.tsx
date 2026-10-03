import React from 'react';
import { BottomSheet } from './BottomSheet';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="How to Play">
      <div className="how-to-play-content">
        <div className="how-to-step">
          <div className="step-badge">1</div>
          <div className="step-text">
            <strong>5 questions a day.</strong> All questions have numeric answers.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">2</div>
          <div className="step-text">
            <strong>15 seconds each.</strong> Enter your best ballpark estimate before the clock runs out.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">3</div>
          <div className="step-text">
            <strong>One guess per question.</strong> Use multipliers (k, m, b) for big numbers.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">4</div>
          <div className="step-text">
            <strong>Closest wins.</strong> You are scored on how close your guess is to the true value. Max score is 500 points per day.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">5</div>
          <div className="step-text">
            <strong>Daily reset.</strong> A fresh set of 5 questions drops every midnight Toronto time.
          </div>
        </div>

        <div className="scoring-table-section">
          <h3 className="section-subheading">Scoring System</h3>
          <div className="scoring-grid">
            <div className="scoring-row header">
              <span>Accuracy</span>
              <span>Points</span>
            </div>
            <div className="scoring-row">
              <span className="badge-exact">Exact Match</span>
              <span className="points-highlight">100</span>
            </div>
            <div className="scoring-row">
              <span>Within 10%</span>
              <span className="points-highlight">90</span>
            </div>
            <div className="scoring-row">
              <span>Within 15%</span>
              <span className="points-highlight">75</span>
            </div>
            <div className="scoring-row">
              <span>Within 30%</span>
              <span className="points-highlight">60</span>
            </div>
            <div className="scoring-row">
              <span>Within 40%</span>
              <span className="points-highlight">50</span>
            </div>
            <div className="scoring-row">
              <span>Within 50%</span>
              <span className="points-highlight">30</span>
            </div>
            <div className="scoring-row">
              <span>Within 75%</span>
              <span className="points-highlight">15</span>
            </div>
            <div className="scoring-row">
              <span>Within 80%</span>
              <span className="points-highlight">10</span>
            </div>
            <div className="scoring-row">
              <span>Within 90%</span>
              <span className="points-highlight">5</span>
            </div>
            <div className="scoring-row">
              <span>Within 99%</span>
              <span className="points-highlight">1</span>
            </div>
            <div className="scoring-row">
              <span>Over 99% off</span>
              <span className="points-highlight">0</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          style={{ marginTop: '24px' }}
          onClick={onClose}
        >
          Got It
        </button>
      </div>
    </BottomSheet>
  );
};
