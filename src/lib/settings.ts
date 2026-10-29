import type { UnitSystem } from './units';
import { REMINDER_HOUR } from '../config';

export interface Settings {
  units: UnitSystem;
  sound: boolean;
  reminder: boolean;
  reminderHour: number; // always REMINDER_HOUR (1 pm); kept so older saved settings still load
  theme: Theme; // always dark unless the player picks light in Settings
}

export type Theme = 'dark' | 'light';

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
  theme: 'dark',
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

/** Applies the theme to the page. Also run early in index.html so light mode doesn't flash dark. */
export function applyTheme(theme: Theme): void {
  try {
    const root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F3F4EE' : '#0B0B0B');
    const scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.setAttribute('content', theme);
  } catch {
    // ignore
  }
}
