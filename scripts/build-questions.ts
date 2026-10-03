import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OBFUSCATION_KEY = 'BALLPARK_SECRET_KEY_2026';

function obfuscateAnswer(num: number): string {
  const str = String(num);
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return Buffer.from(result, 'binary').toString('base64');
}

export interface QuestionData {
  qNum: number;
  category: string;
  question: string;
  answer: string; // obfuscated base64
  unit: string;
  difficulty: string;
}

export type QuestionsByDay = Record<string, QuestionData[]>;

async function buildQuestions() {
  const filePath = path.resolve(__dirname, '../data/Ballpark_Questions.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`Spreadsheet not found at ${filePath}`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('Daily Questions');
  if (!sheet) {
    console.error('Sheet "Daily Questions" not found in spreadsheet.');
    process.exit(1);
  }

  const questionsByDay: QuestionsByDay = {};
  const warnings: string[] = [];
  let totalQuestions = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Header row

    const dayVal = row.getCell(1).value;
    const qNumVal = row.getCell(3).value;
    const categoryVal = row.getCell(4).value;
    const questionVal = row.getCell(5).value;
    const answerVal = row.getCell(6).value;
    const unitVal = row.getCell(7).value;
    const difficultyVal = row.getCell(8).value;
    const verifiedVal = row.getCell(10).value;

    if (!dayVal || !qNumVal || !questionVal) return;

    const day = Number(dayVal);
    const qNum = Number(qNumVal);
    const category = String(categoryVal ?? '').trim();
    const question = String(questionVal ?? '').trim();
    const rawAnswer = Number(answerVal);
    const unit = String(unitVal ?? '').trim();
    const difficulty = String(difficultyVal ?? '').trim();
    const verified = String(verifiedVal ?? '').trim();

    if (verified.toLowerCase() === 'fix needed') {
      warnings.push(`Row ${rowNumber} (Day ${day}, Q#${qNum}): Verified is marked as "Fix needed"`);
    }

    if (isNaN(rawAnswer)) {
      warnings.push(`Row ${rowNumber} (Day ${day}, Q#${qNum}): Invalid numeric answer "${answerVal}"`);
    }

    if (!questionsByDay[day]) {
      questionsByDay[day] = [];
    }

    questionsByDay[day].push({
      qNum,
      category,
      question,
      answer: obfuscateAnswer(rawAnswer),
      unit,
      difficulty,
    });

    totalQuestions++;
  });

  // Sort each day's questions by qNum
  for (const day in questionsByDay) {
    questionsByDay[day].sort((a, b) => a.qNum - b.qNum);
    if (questionsByDay[day].length !== 5) {
      warnings.push(`Day ${day} does not have exactly 5 questions (found ${questionsByDay[day].length})`);
    }
  }

  const totalDays = Object.keys(questionsByDay).length;

  const outputDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'questions.json');
  fs.writeFileSync(outputPath, JSON.stringify(questionsByDay, null, 2), 'utf-8');

  console.log('--- Questions Build Summary ---');
  console.log(`Days loaded: ${totalDays}`);
  console.log(`Questions loaded: ${totalQuestions}`);
  console.log(`Saved to: ${outputPath}`);

  if (warnings.length > 0) {
    console.warn(`\nWarnings (${warnings.length}):`);
    warnings.forEach((w) => console.warn(`- ${w}`));
  } else {
    console.log('No warnings: all verified and each day contains 5 questions.');
  }
}

buildQuestions().catch((err) => {
  console.error('Error building questions:', err);
  process.exit(1);
});
