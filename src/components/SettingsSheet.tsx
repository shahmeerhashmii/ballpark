import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { Settings } from '../lib/settings';
import { enableReminder, disableReminder, reminderSupport, formatHour } from '../lib/reminders';
import { REMINDER_HOUR } from '../config';
import { playCrack } from '../lib/sound';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (next: Settings) => void;
  playerId: string;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({ isOpen, onClose, settings, onChange, playerId }) => {
  const [reminderMsg, setReminderMsg] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const support = reminderSupport();

  const setUnits = (units: Settings['units']) => onChange({ ...settings, units });

  const toggleSound = () => {
    const next = { ...settings, sound: !settings.sound };
    onChange(next);
    // play a sample right away so the player hears what they turned on (and iOS unlocks audio)
    if (next.sound) window.setTimeout(() => playCrack(0.8), 30);
  };

  const toggleReminder = async () => {
    if (busy) return;
    setBusy(true);
    if (settings.reminder) {
      await disableReminder();
      onChange({ ...settings, reminder: false });
      setReminderMsg('Reminder off.');
    } else {
      const res = await enableReminder(playerId, REMINDER_HOUR);
      setReminderMsg(res.message);
      if (res.ok) onChange({ ...settings, reminder: true });
    }
    setBusy(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="settings-content">
        <section className="setting-row">
          <div className="setting-label">
            <strong>Units</strong>
            <span>Distances, heights and weights. Changes apply from your next question.</span>
          </div>
          <div className="mode-toggle compact" role="radiogroup" aria-label="Units">
            {(['metric', 'imperial'] as const).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={settings.units === u}
                className={`mode-option ${settings.units === u ? 'active' : ''}`}
                onClick={() => setUnits(u)}
              >
                {u === 'metric' ? 'km, kg' : 'mi, lb'}
              </button>
            ))}
          </div>
        </section>

        <section className="setting-row">
          <div className="setting-label">
            <strong>Appearance</strong>
            <span>Dark is the default.</span>
          </div>
          <div className="mode-toggle compact theme-toggle" role="radiogroup" aria-label="Appearance">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={settings.theme === t}
                className={`mode-option ${settings.theme === t ? 'active' : ''}`}
                onClick={() => onChange({ ...settings, theme: t })}
              >
                <span aria-hidden="true">{t === 'dark' ? '🌙' : '☀️'}</span>
                {t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </section>

        <section className="setting-row">
          <div className="setting-label">
            <strong>Sound</strong>
            <span>Bat crack, crowd cheers and the clock.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.sound}
            className={`switch ${settings.sound ? 'on' : ''}`}
            onClick={toggleSound}
          >
            <span className="switch-knob" />
            <span className="sr-only">Sound</span>
          </button>
        </section>

        <section className="setting-row column">
          <div className="setting-row-inner">
            <div className="setting-label">
              <strong>Daily reminder</strong>
              <span>
                {support === 'install-first'
                  ? 'Add Ballpark to your Home Screen to use reminders.'
                  : `A nudge at ${formatHour(REMINDER_HOUR)} on days you haven't played yet.`}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reminder}
              className={`switch ${settings.reminder ? 'on' : ''}`}
              onClick={toggleReminder}
              disabled={busy}
            >
              <span className="switch-knob" />
              <span className="sr-only">Daily reminder</span>
            </button>
          </div>
          {reminderMsg && <p className="setting-note" role="status">{reminderMsg}</p>}
        </section>

        <button type="button" className="primary-button" style={{ marginTop: '20px' }} onClick={onClose}>
          Done
        </button>
      </div>
    </BottomSheet>
  );
};
