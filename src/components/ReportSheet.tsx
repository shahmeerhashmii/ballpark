import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { submitReport } from '../lib/supabase';

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  puzzleDay: number;
  qIndex: number;
  question: string;
  shownAnswer: string;
}

const REASONS = ['The answer looks wrong', 'The question is unclear', 'Typo or wording', 'Something else'];

export const ReportSheet: React.FC<ReportSheetProps> = ({
  isOpen,
  onClose,
  playerId,
  puzzleDay,
  qIndex,
  question,
  shownAnswer,
}) => {
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [note, setNote] = useState<string>('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== 'idle') return;
    setState('sending');
    await submitReport({
      player_id: playerId,
      puzzle_day: puzzleDay,
      q_index: qIndex,
      question: question.slice(0, 400),
      shown_answer: shownAnswer.slice(0, 120),
      reason,
      note: note.trim().slice(0, 500),
    });
    setState('done');
  };

  const close = () => {
    onClose();
    // reset after the sheet closes so the next report starts fresh
    window.setTimeout(() => {
      setState('idle');
      setNote('');
      setReason(REASONS[0]);
    }, 300);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={close} title="Report this answer">
      {state === 'done' ? (
        <div className="report-done">
          <p className="report-done-title">Thanks, we'll check it.</p>
          <p className="setting-note">Reports help keep every question accurate.</p>
          <button type="button" className="primary-button" onClick={close}>
            Done
          </button>
        </div>
      ) : (
        <form className="report-form" onSubmit={handleSubmit}>
          <p className="report-question">
            {question}
            <span>Answer shown: {shownAnswer}</span>
          </p>
          <fieldset className="report-reasons">
            <legend className="sr-only">What's wrong?</legend>
            {REASONS.map((r) => (
              <label key={r} className={`report-reason ${reason === r ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                {r}
              </label>
            ))}
          </fieldset>
          <label className="report-note-label" htmlFor="report-note">
            Anything else? (optional)
          </label>
          <textarea
            id="report-note"
            className="report-note"
            rows={3}
            maxLength={500}
            placeholder="For example, the source you found"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="primary-button" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending...' : 'Send report'}
          </button>
        </form>
      )}
    </BottomSheet>
  );
};
