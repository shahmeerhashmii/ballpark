import React, { useState } from 'react';
import { QuestionItem } from '../types';
import { Timer } from '../components/Timer';
import { Keypad, Multiplier, computeNumericValue, formatWithCommas } from '../components/Keypad';

interface QuestionScreenProps {
  questionNumber: number; // 1 to 5
  totalQuestions?: number;
  question: QuestionItem;
  startTime: number;
  onSubmitGuess: (guess: number) => void;
  onTimeUp: (guess: number) => void;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({
  questionNumber,
  totalQuestions = 5,
  question,
  startTime,
  onSubmitGuess,
  onTimeUp,
}) => {
  const [inputString, setInputString] = useState<string>('');
  const [activeMultiplier, setActiveMultiplier] = useState<Multiplier>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const numericValue = computeNumericValue(inputString, activeMultiplier);

  const handleLockIn = () => {
    if (numericValue <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    onSubmitGuess(numericValue);
  };

  const handleTimeUp = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // If valid number typed, submit it; else submit 0
    onTimeUp(numericValue > 0 ? numericValue : 0);
  };

  const formatDisplayValue = () => {
    if (!inputString) return '0';
    return inputString;
  };

  return (
    <div className="screen-container question-screen">
      {/* Top Bar with Question Progress and Circular Timer */}
      <header className="question-header">
        <div className="question-meta">
          <span className="question-progress-label">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="question-category-tag">{question.category}</span>
        </div>
        <Timer startTime={startTime} onTimeUp={handleTimeUp} isRunning={!isSubmitting} />
      </header>

      {/* Main Question Display Area */}
      <main className="question-main-content">
        <h2 className="question-text">{question.question}</h2>

        {/* Number Input Display Card */}
        <div className="number-display-card">
          <div className="unit-label-top">{question.unit}</div>
          <div className="entered-number-row">
            <span className="entered-digits">{formatDisplayValue()}</span>
            {activeMultiplier && (
              <span className="entered-multiplier-suffix"> {activeMultiplier}</span>
            )}
          </div>
          {activeMultiplier && numericValue > 0 && (
            <div className="calculated-total-subtext">
              = {formatWithCommas(numericValue)} {question.unit}
            </div>
          )}
        </div>
      </main>

      {/* Keypad & Lock-in Button pinned to bottom */}
      <footer className="question-footer">
        <Keypad
          inputString={inputString}
          onInputChange={setInputString}
          activeMultiplier={activeMultiplier}
          onMultiplierChange={setActiveMultiplier}
          onLockIn={handleLockIn}
          disabled={isSubmitting}
        />
      </footer>
    </div>
  );
};
