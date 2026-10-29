import React from 'react';
import { BottomSheet } from './BottomSheet';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Shown to players in simple 10% steps. The real scoring is worked out to the foot
// (see src/lib/scoring.ts), so every bit closer goes further. Each row is the shortest
// distance for that step: going under lands a little shorter than going over by the same
// percent, because double the answer and half of it count the same.
const DISTANCE_STEPS: { guess: string; distance: string }[] = [
  { guess: 'Spot on', distance: '450 ft' },
  { guess: 'Within 10%', distance: '390 to 450 ft' },
  { guess: 'Within 20%', distance: '300 ft or more' },
  { guess: 'Within 30%', distance: '225 ft or more' },
  { guess: 'Within 40%', distance: '160 ft or more' },
  { guess: 'Within 50%', distance: '100 ft or more' },
  { guess: 'Further off', distance: 'under 100 ft' },
];

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="How to play">
      <div className="how-to-play-content">
        <div className="how-to-step">
          <div className="step-badge">1</div>
          <div className="step-text">
            <strong>5 questions a day.</strong> Everyday trivia with a number for an answer. No sports knowledge needed.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">2</div>
          <div className="step-text">
            <strong>Your guess is a hit.</strong> The closer you are, the further the ball flies, down to the foot. Get within about 10% to clear the 400 ft wall.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">3</div>
          <div className="step-text">
            <strong>3 swings on every question.</strong> After each one we tell you if you're too high or too low. All 3 count the same, your closest guess counts, and you can tap Keep best to stop early.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">4</div>
          <div className="step-text">
            <strong>Stuck? Take a hint</strong> to see the range the answer is in. Or switch to <strong>Easy</strong> and just pick from 4 ranges.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">5</div>
          <div className="step-text">
            <strong>30 seconds per swing,</strong> new questions every midnight EST. Practice mode has no clock.
            Play 7 days in a row to earn a 🧊 streak freeze, which covers a day you miss.
          </div>
        </div>

        <div className="scoring-table-section">
          <h3 className="section-subheading">How far it goes</h3>
          <div className="scoring-grid">
            <div className="scoring-row header">
              <span>Your guess</span>
              <span>Distance</span>
            </div>
            {DISTANCE_STEPS.map((row) => (
              <div key={row.guess} className="scoring-row">
                <span>{row.guess}</span>
                <span className="points-highlight">{row.distance}</span>
              </div>
            ))}
          </div>
          <p className="scoring-footnote">Every foot counts, so a closer guess always goes further. Double the answer counts the same as half of it. A hint costs 15% of your distance. Max is 450 ft a question, 2,250 a day.</p>
        </div>

        <button type="button" className="primary-button" style={{ marginTop: '24px' }} onClick={onClose}>
          Got it
        </button>
      </div>
    </BottomSheet>
  );
};
