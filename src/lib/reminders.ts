// Daily reminder for the installed app.
// Preferred: real web push from the daily-reminder Supabase function (works on iPhone once
// Ballpark is added to the Home Screen, plus Android and desktop).
// Fallback: periodic background sync, which installed Android Chrome can do with no server.

import { savePushSubscription, removePushSubscription, isSupabaseConfigured } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const META_CACHE = 'ballpark-meta';

export type ReminderSupport =
  | 'ready' // can turn on now
  | 'install-first' // iPhone or iPad in Safari: needs Add to Home Screen first
  | 'unsupported'; // this browser can't do notifications

export function isInstalled(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function reminderSupport(): ReminderSupport {
  const hasSW = 'serviceWorker' in navigator;
  const hasNotif = typeof window !== 'undefined' && 'Notification' in window;
  if (isIOS() && !isInstalled()) return 'install-first';
  if (!hasSW || !hasNotif) return 'unsupported';
  return 'ready';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Shares what the service worker needs (reminder on, hour, last day played) through the Cache API. */
export async function updateReminderMeta(patch: Record<string, unknown>): Promise<void> {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(META_CACHE);
    const res = await cache.match('/ballpark-meta.json');
    const current = res ? await res.json() : {};
    await cache.put(
      '/ballpark-meta.json',
      new Response(JSON.stringify({ ...current, ...patch }), { headers: { 'Content-Type': 'application/json' } })
    );
  } catch {
    // ignore
  }
}

export interface ReminderResult {
  ok: boolean;
  message: string;
}

export async function enableReminder(playerId: string, hour: number): Promise<ReminderResult> {
  const support = reminderSupport();
  if (support === 'install-first') {
    return { ok: false, message: 'On iPhone, add Ballpark to your Home Screen first (Share, then Add to Home Screen), then turn this on from there.' };
  }
  if (support === 'unsupported') {
    return { ok: false, message: "This browser can't show notifications. Try installing Ballpark from Chrome, Edge or Safari." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, message: 'Notifications are blocked. You can allow them in your browser or phone settings.' };
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.ready;
  } catch {
    return { ok: false, message: 'Reminders need the installed app. Add Ballpark to your home screen and try again.' };
  }

  await updateReminderMeta({ reminder: true, reminderHour: hour });

  // 1. Real push, when the server side is set up
  if (VAPID_PUBLIC_KEY && isSupabaseConfigured && 'pushManager' in registration) {
    try {
      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      const saved = await savePushSubscription({
        playerId,
        subscription: sub.toJSON(),
        hour,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto',
      });
      if (saved) return { ok: true, message: `Reminder on. You'll get one at ${formatHour(hour)} on days you haven't played yet.` };
    } catch {
      // fall through to periodic sync
    }
  }

  // 2. Android Chrome fallback that needs no server
  const periodic = (registration as unknown as { periodicSync?: { register: (tag: string, o: object) => Promise<void> } }).periodicSync;
  if (periodic) {
    try {
      await periodic.register('ballpark-daily-reminder', { minInterval: 12 * 60 * 60 * 1000 });
      return { ok: true, message: `Reminder on. It comes after ${formatHour(hour)} on days you haven't played (your phone picks the exact minute).` };
    } catch {
      // not allowed (usually means the app isn't installed)
    }
  }

  return { ok: false, message: "Reminders aren't set up on the server yet, so they can't be turned on here." };
}

export async function disableReminder(): Promise<void> {
  await updateReminderMeta({ reminder: false });
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager?.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    const periodic = (registration as unknown as { periodicSync?: { unregister: (tag: string) => Promise<void> } }).periodicSync;
    await periodic?.unregister('ballpark-daily-reminder');
  } catch {
    // nothing to undo
  }
}

export function formatHour(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${suffix}`;
}
