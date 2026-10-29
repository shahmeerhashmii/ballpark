import React from 'react';
import { BottomSheet } from './BottomSheet';
import { TIERS } from '../lib/scoring';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIER_RULES: Record<string, string> = {
  park: 'Within 10%',
  deep: 'Within 25%',
  solid: 'Within 50%',
  play: 'Within 2x',
  caught: 'Within 4x',
  miss: 'Further off',
};

const TIER_FEET: Record<string, string> = {
  park: '400+ ft',
  deep: '300 to 400',
  solid: '200 to 300',
  play: '100 to 200',
  caught: 'under 100',
  miss: '0 ft',
};

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
            <strong>Your guess is a hit.</strong> The closer you are, the further the ball flies. Within 10% clears the wall.
          </div>
        </div>

        <div className="how-to-step">
          <div className="step-badge">3</div>
          <div className="step-text">
            <strong>3 swings on every question.</strong> After each one we tell you if you're too high or too low. Each extra swing flies a little shorter, your best one counts, and you can tap Keep best to stop early.
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
            <strong>30 seconds per swing,</strong> new questions every midnight Toronto time. Practice mode has no clock.
            Play 7 days in a row to earn a 🧊 streak freeze, which covers a day you miss.
          </div>
        </div>

        <div className="scoring-table-section">
          <h3 className="section-subheading">How far it goes</h3>
          <div className="scoring-grid">
            <div className="scoring-row header">
              <span>Your guess</span>
              <span>Hit</span>
            </div>
            {TIERS.map((t) => (
              <div key={t.key} className="scoring-row">
                <span>{TIER_RULES[t.key]}</span>
                <span className="tier-cell">
                  <span className="tier-dot" style={{ backgroundColor: t.color }} />
                  {t.short} <em>{TIER_FEET[t.key]}</em>
                </span>
              </div>
            ))}
          </div>
          <p className="scoring-footnote">Double the answer counts the same as half of it. Max is 450 ft a question, 2,250 a day.</p>
        </div>

        <button type="button" className="primary-button" style={{ marginTop: '24px' }} onClick={onClose}>
          Got it
        </button>
      </div>
    </BottomSheet>
  );
};
