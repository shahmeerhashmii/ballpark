import { START_DATE, TIME_ZONE, OBFUSCATION_KEY } from '../config';

export function getTodayTorontoDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Returns "YYYY-MM-DD"
}

export function getCurrentPuzzleDay(): {
  dayNumber: number;
  isBeforeStart: boolean;
  daysUntilStart: number;
  formattedDate: string;
} {
  const todayStr = getTodayTorontoDateString();
  const todayDate = new Date(todayStr + 'T00:00:00');
  const startDate = new Date(START_DATE + 'T00:00:00');

  const diffTime = todayDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isBeforeStart = diffDays < 0;
  const daysUntilStart = isBeforeStart ? Math.abs(diffDays) : 0;
  const dayNumber = diffDays + 1;

  // Format today's date for display (e.g., "Monday, October 5, 2026")
  const displayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedDate = displayFormatter.format(new Date());

  return {
    dayNumber,
    isBeforeStart,
    daysUntilStart,
    formattedDate,
  };
}

export function getSecondsUntilMidnightToronto(): number {
  const now = new Date();
  // Get current time parts in Toronto
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const second = Number(parts.find((p) => p.type === 'second')?.value ?? 0);

  const secondsPassedToday = hour * 3600 + minute * 60 + second;
  const totalSecondsInDay = 86400;
  return Math.max(0, totalSecondsInDay - secondsPassedToday);
}

export function formatTimeRemaining(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function decodeAnswer(obfuscatedBase64: string): number {
  try {
    const rawBinary = atob(obfuscatedBase64);
    let decodedStr = '';
    for (let i = 0; i < rawBinary.length; i++) {
      const charCode = rawBinary.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
      decodedStr += String.fromCharCode(charCode);
    }
    return Number(decodedStr);
  } catch {
    return 0;
  }
}
