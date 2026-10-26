/* Ballpark reminder handlers, loaded into the app's service worker (see vite.config.ts importScripts).
   1. Web push from the daily-reminder Supabase function (iPhone, Android, desktop).
   2. Periodic background sync, a no-server fallback that only installed Android Chrome supports.
      The page stores the last day you played in the Cache API, so the reminder skips days you already played. */

const META_CACHE = 'ballpark-meta';
const START = Date.UTC(2026, 9, 5); // 2026-10-05, must match src/config.ts

function todayPuzzleDay() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).split('-').map(Number);
  return Math.round((Date.UTC(parts[0], parts[1] - 1, parts[2]) - START) / 86400000) + 1;
}

async function readMeta() {
  try {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match('/ballpark-meta.json');
    return res ? await res.json() : {};
  } catch (e) {
    return {};
  }
}

async function writeMeta(meta) {
  try {
    const cache = await caches.open(META_CACHE);
    await cache.put('/ballpark-meta.json', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {
    /* ignore */
  }
}

function showReminder(title, body, url) {
  return self.registration.showNotification(title, {
    body,
    icon: 'icon-192.png',
    badge: 'favicon-32.png',
    tag: 'ballpark-daily',
    renotify: false,
    data: { url: url || self.registration.scope },
  });
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }
  const day = todayPuzzleDay();
  event.waitUntil(
    showReminder(payload.title || `You haven't played Ballpark #${day} yet`, payload.body || "Today's 5 questions are waiting. Step up to the plate and keep your streak going.", payload.url)
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'ballpark-daily-reminder') return;
  event.waitUntil(
    (async () => {
      const meta = await readMeta();
      const day = todayPuzzleDay();
      const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
      if (!meta.reminder) return;
      if (meta.lastPlayedDay === day || meta.lastRemindedDay === day) return;
      if (hour < (typeof meta.reminderHour === 'number' ? meta.reminderHour : 13)) return;
      await showReminder(`You haven't played Ballpark #${day} yet`, "Today's 5 questions are waiting. Step up to the plate and keep your streak going.");
      await writeMeta({ ...meta, lastRemindedDay: day });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if (w.url.startsWith(self.registration.scope) && 'focus' in w) return w.focus();
      }
      return self.clients.openWindow(url);
    })()
  );
});
