import type { UnitSystem } from './units';
import { REMINDER_HOUR } from '../config';

export interface Settings {
  units: UnitSystem;
  sound: boolean;
  reminder: boolean;
  reminderHour: number; // always REMINDER_HOUR (1 pm); kept so older saved settings still load
}

const KEY = 'ballpark_settings';

// Canadians are used to metric, Americans to imperial, so the first default follows the phone's region
function defaultUnits(): UnitSystem {
  try {
    const locale = navigator.language || '';
    return /-(US|LR|MM)$/i.test(locale) ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

const DEFAULTS: Settings = {
  units: 'metric',
  sound: false,
  reminder: false,
  reminderHour: REMINDER_HOUR,
};

export function getSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw), reminderHour: REMINDER_HOUR };
  } catch {
    // storage blocked: fall through to defaults
  }
  return { ...DEFAULTS, units: defaultUnits() };
}

export function saveSettings(s: Settings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked: settings last for this visit only
  }
}
