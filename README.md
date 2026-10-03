# Ballpark

> Five guesses a day. Closest wins.

**Live URL:** [https://shahmeerhashmii.github.io/ballpark/](https://shahmeerhashmii.github.io/ballpark/)

Ballpark is a fast-paced daily estimation game designed like a modern sports scoreboard. Every day at midnight America/Toronto time, players get 5 questions with numeric answers. You have 15 seconds per question to lock in your ballpark estimate and see how your guesses stack up against everyone else.

---

## How to Play

1. **5 Questions Daily:** Every player receives the same 5 questions each day.
2. **15 Seconds per Question:** Use the custom on-screen thumb keypad to type your guess.
3. **Multiplier Chips:** Quick buttons for `thousand` (k), `million` (m), and `billion` (b) help you enter huge numbers instantly.
4. **Closest Wins:** Points are awarded based on percentage difference from the true answer (up to 100 points per question, max 500 per day).
5. **Community Breakdown:** After each question, see how your estimate compares to the crowd.
6. **Share Your Score:** Copy or share your daily emoji grid with friends.

---

## Scoring Breakdown

| Accuracy | Points |
| :--- | :--- |
| **Exact Match** (within 0.01%) | 100 |
| **Within 10%** | 90 |
| **Within 15%** | 75 |
| **Within 30%** | 60 |
| **Within 40%** | 50 |
| **Within 50%** | 30 |
| **Within 75%** | 15 |
| **Within 80%** | 10 |
| **Within 90%** | 5 |
| **Within 99%** | 1 |
| **More than 99% off** | 0 |

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

## License

MIT © Shahmeer Hashmi
