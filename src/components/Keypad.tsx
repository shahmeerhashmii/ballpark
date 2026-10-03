import React, { useEffect } from 'react';

export type Multiplier = 'thousand' | 'million' | 'billion' | null;

interface KeypadProps {
  inputString: string;
  onInputChange: (newVal: string) => void;
  activeMultiplier: Multiplier;
  onMultiplierChange: (multiplier: Multiplier) => void;
  onLockIn: () => void;
  disabled?: boolean;
}

export function computeNumericValue(inputString: string, multiplier: Multiplier): number {
  if (!inputString || inputString === '.') return 0;
  const num = parseFloat(inputString);
  if (isNaN(num)) return 0;

  if (multiplier === 'thousand') return num * 1_000;
  if (multiplier === 'million') return num * 1_000_000;
  if (multiplier === 'billion') return num * 1_000_000_000;
  return num;
}

export function formatWithCommas(num: number): string {
  if (isNaN(num)) return '0';
  // If integer or decimal
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export const Keypad: React.FC<KeypadProps> = ({
  inputString,
  onInputChange,
  activeMultiplier,
  onMultiplierChange,
  onLockIn,
  disabled = false,
}) => {
  const handleDigit = (digit: string) => {
    if (disabled) return;
    // Max 12 digits (excluding decimal point)
    const digitCount = inputString.replace('.', '').length;
    if (digitCount >= 12) return;

    if (inputString === '0' && digit === '0') return;
    if (inputString === '0' && digit !== '.') {
      onInputChange(digit);
      return;
    }
    onInputChange(inputString + digit);
  };

  const handleDecimal = () => {
    if (disabled) return;
    if (inputString.includes('.')) return;
    if (inputString === '') {
      onInputChange('0.');
    } else {
      onInputChange(inputString + '.');
    }
  };

  const handleBackspace = () => {
    if (disabled) return;
    if (inputString.length <= 1) {
      onInputChange('');
    } else {
      onInputChange(inputString.slice(0, -1));
    }
  };

  const toggleMultiplier = (multiplier: 'thousand' | 'million' | 'billion') => {
    if (disabled) return;
    if (activeMultiplier === multiplier) {
      onMultiplierChange(null);
    } else {
      onMultiplierChange(multiplier);
    }
  };

  // Keyboard navigation for desktop
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused (though we have no default input elements)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const val = computeNumericValue(inputString, activeMultiplier);
        if (val > 0) {
          onLockIn();
        }
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleMultiplier('thousand');
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMultiplier('million');
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleMultiplier('billion');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputString, activeMultiplier, disabled, onLockIn]);

  const numVal = computeNumericValue(inputString, activeMultiplier);
  const isLockInEnabled = numVal > 0 && !disabled;

  return (
    <div className="keypad-container">
      {/* Multiplier Chips */}
      <div className="chips-row">
        <button
          type="button"
          className={`multiplier-chip ${activeMultiplier === 'thousand' ? 'active' : ''}`}
          onClick={() => toggleMultiplier('thousand')}
          disabled={disabled}
        >
          thousand
        </button>
        <button
          type="button"
          className={`multiplier-chip ${activeMultiplier === 'million' ? 'active' : ''}`}
          onClick={() => toggleMultiplier('million')}
          disabled={disabled}
        >
          million
        </button>
        <button
          type="button"
          className={`multiplier-chip ${activeMultiplier === 'billion' ? 'active' : ''}`}
          onClick={() => toggleMultiplier('billion')}
          disabled={disabled}
        >
          billion
        </button>
      </div>

      {/* Grid of keys */}
      <div className="keypad-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            className="keypad-btn"
            onClick={() => handleDigit(digit)}
            disabled={disabled}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          className="keypad-btn"
          onClick={handleDecimal}
          disabled={disabled}
          aria-label="Decimal point"
        >
          .
        </button>
        <button
          type="button"
          className="keypad-btn"
          onClick={() => handleDigit('0')}
          disabled={disabled}
        >
          0
        </button>
        <button
          type="button"
          className="keypad-btn"
          onClick={handleBackspace}
          disabled={disabled}
          aria-label="Backspace"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
            <line x1="18" y1="9" x2="12" y2="15"></line>
            <line x1="12" y1="9" x2="18" y2="15"></line>
          </svg>
        </button>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        className="primary-button lock-in-btn"
        disabled={!isLockInEnabled}
        onClick={onLockIn}
      >
        Lock In
      </button>
    </div>
  );
};
