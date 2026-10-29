# Ballpark

> Guess the number. Hit it out of the park.

**Live URL:** [https://shahmeerhashmii.github.io/ballpark/](https://shahmeerhashmii.github.io/ballpark/)

Ballpark is a daily estimation game played in a ballpark. Every day at midnight Eastern time, everyone gets the same 5 questions with a number for an answer. Your guess is a hit: the closer you are, the further the ball flies.

---

## How to Play

1. **5 questions a day.** Everyday trivia, no sports knowledge needed.
2. **3 swings on every question, 30 seconds per swing.** After each swing you're told if you're too high or too low. Tap **Keep best** to stop early.
3. **Your closest guess counts.** All 3 swings are worth the same.
4. **Hint:** shows a 10x range the answer is in, for a 15% distance cost.
5. **Easy mode:** pick from 4 ranges instead of typing. Scored as right, close or wrong, and kept separate from Classic stats.
6. **Practice mode:** unlimited past questions, no timer.
7. **Streak freezes:** earn one every 7 days in a row (hold up to 2). A freeze covers a day you miss.
8. **Share:** a text result or a picture card for Instagram.

**Settings:** metric or imperial units, sound, a 1 pm daily reminder, and light or dark mode (dark is the default).

---

## Scoring

Closeness is a ratio (bigger divided by smaller), so guessing double the answer counts the same as guessing half.
Distance is worked out to the foot, from 0 to 450 ft per question (2,250 a day), so every bit closer goes further.
On an answer of 6,000, a guess of 5,800 goes 432 ft and 5,700 goes 423 ft, even though both are within 10%.

| Closeness (ratio) | Hit | Distance |
| :--- | :--- | :--- |
| Within 1.1x (about 10%) | Out of the park | 400 to 450 ft |
| Within 1.25x | Deep to the wall | 300 to 400 ft |
| Within 1.5x | Solid hit | 200 to 300 ft |
| Within 2x | In play | 100 to 200 ft |
| Within 4x | Caught | 1 to 100 ft |
| Further off | Swing and a miss | 0 ft |

Inside each band the distance slides smoothly on a log scale and the bands join with no jumps. All 3 swings are worth the same; a hint costs 15%. Players only see a simple table in 10% steps on the How to Play screen. The database stores the counted distance in feet. The logic lives in `src/lib/scoring.ts` and `src/lib/game.ts`, and is covered by tests (including a check of the best-swing rule across every question in the game).

---

## Local Development

### Prerequisites
- Node.js 20 or higher
- npm

### Setup
```bash
# Clone the repository
git clone https://github.com/shahmeerhashmii/ballpark.git
cd ballpark

# Install dependencies
npm install

# Start the development server (automatically parses questions and generates icons)
npm run dev
```

### Dev Mode URL Parameters
- `?day=N`: Preview any specific day number (e.g. `http://localhost:5173/ballpark/?day=3`).
- Days run from October 5, 2026 (day 1) to July 31, 2027 (day 300). Add more rows to the spreadsheet before then.
- `?reset`: Clear local storage state and start fresh.

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

---

## Adding More Days to the Spreadsheet

1. Open `data/Ballpark_Questions.xlsx` in Excel or your spreadsheet editor.
2. Go to the sheet named **Daily Questions**.
3. Add rows following the existing schema:
   - **Day:** Integer day number (1, 2, 3...)
   - **Date:** Excel date serial
   - **Q#:** 1 to 5 (each day must have 5 questions)
   - **Category:** Category name
   - **Question:** The question prompt
   - **Answer:** Numeric answer only
   - **Unit:** Unit of measurement (e.g., `metres`, `km`, `species`, `points`)
   - **Difficulty:** `Easy`, `Medium`, or `Hard`
   - **Verified?:** Mark as verified or leave blank once checked
4. Save the spreadsheet.
5. Run `npm run build` or `npm run dev`. The build script will automatically obfuscate answers and compile them into `src/data/questions.json`.

---

## Supabase Setup (Community Stats)

Ballpark supports real-time aggregate community stats with zero authentication required.

1. Create a free project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the entire SQL script found in `supabase/schema.sql`.
4. Copy your **Project URL** and **Anon Public Key** from **Project Settings > API**.
5. Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
6. For GitHub Pages deployment, add these as repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## Reports, reminders and the link preview

### Answer reports
Players can tap **"Something wrong with this answer? Report it"** on any answer screen.
Reports go to the `answer_reports` table in Supabase (run the latest `supabase/schema.sql`).
Read them in the Supabase dashboard under **Table editor > answer_reports**.

### Daily reminder notifications
Reminders work in the installed app (on iPhone, Ballpark must be added to the Home Screen first).
One-time setup:
1. Generate keys: `npx web-push generate-vapid-keys`
2. In Supabase, set secrets: `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com`
3. Deploy the sender: `supabase functions deploy daily-reminder`
4. Turn on the `pg_cron` and `pg_net` extensions and run the hourly schedule at the bottom of `supabase/schema.sql`.
5. Add the public key as the GitHub secret `VITE_VAPID_PUBLIC_KEY` (and in `.env` for local testing).

Without these steps, installed Android Chrome still gets a basic reminder through periodic background sync.

### Link preview image
`public/og-image.png` is the picture shown when the link is shared. Its source is `scripts/og-image.html`;
edit it and re-render at 1200x630 (instructions are at the top of that file).

---

## License

MIT © Shahmeer Hashmi
