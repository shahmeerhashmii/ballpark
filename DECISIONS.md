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
- **Decision:** Built the 15-second countdown timer on absolute wall-clock timestamps (`Date.now()`) with interval polling and haptic feedback.
- **Reasoning:** Counter-based timers pause when browsers background inactive tabs or minimize. Absolute timestamp comparison guarantees fair 15-second limits even across tab switches and refreshes.

### 5. Resilient Community Stats Architecture
- **Decision:** Implemented optimistic offline queueing in `localStorage` for Supabase guess submissions and statistical aggregations.
- **Reasoning:** Guarantees that the core game functions smoothly in offline mode and gracefully degrades when network or Supabase environment variables are absent.

### 6. PWA & Asset Pipeline
- **Decision:** Employed `@resvg/resvg-js` to generate high-resolution raster icons (180x180, 192x192, 512x512, and 80% centered maskable variants) directly from the master vector SVG.
- **Reasoning:** Delivers crisp icon renderings for standalone mobile install states on Android, iOS, and desktop PWA shells with zero manual image editing required.

### 7. Strict Copy & Typography Rules
- **Decision:** Maintained high-contrast dark theme (#0B0B0B background with #C6F432 electric lime accents) using Bricolage Grotesque and Instrument Sans, strictly omitting em dashes.
- **Reasoning:** Adheres to the scoreboard aesthetic and all prompt typography and copy constraints.
