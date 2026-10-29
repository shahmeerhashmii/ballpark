# Architectural & Design Decisions

This document records architectural, styling, and structural decisions made during the development of Ballpark.

### 1. Data Obfuscation & Security
- **Decision:** Obfuscated question answers at build time using XOR encryption with a constant key followed by Base64 encoding.
- **Reasoning:** Prevents trivial inspection of `questions.json` in the browser bundle or network tab while keeping client-side decompression instantaneous without heavy cryptographic dependencies.

### 2. Timezone & Daily Logic
- **Decision:** Standardized on `America/Toronto` timezone calculation using `Intl.DateTimeFormat`.
- **Reasoning:** Ensures every player worldwide shares the exact same puzzle day and synchronization at midnight Toronto time, regardless of their local computer clock or geographical location.

### 3. Touch-First Custom Keypad & Layout
- **Decision:** Implemented an in-app 12-key numeric pad with quick multiplier chips (`thousand`, `million`, `billion`) and desktop keyboard bindings (`0-9`, `.`, `Backspace`, `Enter`, `k`, `m`, `b`).
- **Reasoning:** Prevents virtual OS keyboard pops, viewport resizing issues, layout jumps on iOS Safari and Android Chrome, and keeps controls comfortably placed in the mobile thumb zone.

### 4. Timer Mechanics
- **Decision:** Each swing gets its own 30-second countdown, built on absolute wall-clock timestamps (`Date.now()`) with interval polling and haptic feedback. The start of the current swing is saved, so a refresh keeps the right time.
- **Reasoning:** Counter-based timers pause when browsers background inactive tabs or minimize. Wall-clock timing keeps the limit fair across tab switches and refreshes. The clock deliberately keeps running if a player leaves the app, so nobody can pause to look an answer up.

### 5. Resilient Community Stats Architecture
- **Decision:** Implemented optimistic offline queueing in `localStorage` for Supabase guess submissions and statistical aggregations.
- **Reasoning:** Guarantees that the core game functions smoothly in offline mode and gracefully degrades when network or Supabase environment variables are absent.

### 6. PWA & Asset Pipeline
- **Decision:** Employed `@resvg/resvg-js` to generate high-resolution raster icons (180x180, 192x192, 512x512, and 80% centered maskable variants) directly from the master vector SVG.
- **Reasoning:** Delivers crisp icon renderings for standalone mobile install states on Android, iOS, and desktop PWA shells with zero manual image editing required.

### 7. Strict Copy & Typography Rules
- **Decision:** High-contrast dark theme by default (#0B0B0B background with #C6F432 electric lime accents) using Bricolage Grotesque and Instrument Sans, strictly omitting em dashes. A light theme is available only from Settings; the game never follows the phone's own light/dark setting.
- **Reasoning:** Adheres to the scoreboard aesthetic and all prompt typography and copy constraints.

### 8. Distance Scoring and the Best Swing
- **Decision:** Score closeness as a ratio and turn it into distance worked out to the foot (0 to 450 ft). Every question gets 3 swings, all worth the same, and the closest guess counts. The How to Play table only shows 10% steps.
- **Reasoning:** The old percent-off scoring punished overshooting far more than undershooting, which made high scores rare. Discounting later swings let a farther early guess beat a much closer later one. Scoring to the foot makes every small improvement count, so close games between friends still have a winner.

### 9. Easy Mode Data
- **Decision:** Easy picks are saved to Supabase with `mode = 'easy'`. Every community number (tiers, median guess, daily average) filters to `mode = 'classic'`.
- **Reasoning:** The daily reminder needs to know that Easy players have played, but Easy picks would skew comparisons between typed guesses.

### 10. Units
- **Decision:** Answers are stored in the spreadsheet's units. Imperial players see converted answers, and their guesses are converted back before being sent to Supabase.
- **Reasoning:** Scoring is a ratio, so it is unit-free, and community numbers stay comparable across players.
