// Metric or imperial, chosen in Settings.
// Answers are stored in the spreadsheet's units (mostly metric). When a player picks imperial,
// the answer, their guess and the unit label are all converted together, so scoring is unchanged
// (closeness is a ratio, and a ratio doesn't care which unit you measure in).
// Guesses sent to Supabase are always converted back, so community numbers stay comparable.

export type UnitSystem = 'metric' | 'imperial';

const TO_IMPERIAL: Record<string, [string, number]> = {
  metres: ['feet', 3.28084],
  km: ['miles', 0.621371],
  cm: ['inches', 0.393701],
  mm: ['inches', 0.0393701],
  'km²': ['sq miles', 0.386102],
  'm²': ['sq ft', 10.7639],
  'm³': ['cubic ft', 35.3147],
  kg: ['pounds', 2.20462],
  grams: ['ounces', 0.035274],
  tonnes: ['tons', 1.10231],
  'km/h': ['mph', 0.621371],
  litres: ['US gallons', 0.264172],
  mL: ['fl oz', 0.033814],
  'metres per second': ['feet per second', 3.28084],
  'km per second': ['miles per second', 0.621371],
  'million km': ['million miles', 0.621371],
  'billion km': ['billion miles', 0.621371],
  'trillion km': ['trillion miles', 0.621371],
  'million km²': ['million sq miles', 0.386102],
  'billion km³': ['billion cubic miles', 0.239913],
  'million m³': ['million cubic yards', 1.30795],
  hectares: ['acres', 2.47105],
};

// Questions that are about units themselves ("How many metres are in a mile?") or that
// name a unit in the wording ("a 355 mL can") stay exactly as written.
const MENTIONS_A_UNIT =
  /\b(metres?|meters?|km|kilomet\w*|miles?|inch(es)?|feet|foot|ounces?|pounds?|grams?|kilograms?|litres?|liters?|gallons?|cups?|teaspoons?|tablespoons?|mL|tonnes?|tons?|kg|hectares?|acres?|yards?)\b/i;

export interface LocalizedAnswer {
  answer: number;
  unit: string;
  factor: number; // multiply a stored value by this to get the shown value
}

function tidy(n: number): number {
  const abs = Math.abs(n);
  if (abs >= 100) return Math.round(n);
  if (abs >= 10) return Math.round(n * 10) / 10;
  if (abs >= 1) return Math.round(n * 100) / 100;
  return Math.round(n * 1000) / 1000;
}

export function localizeAnswer(questionText: string, answer: number, unit: string, system: UnitSystem): LocalizedAnswer {
  if (system === 'metric' || !unit) return { answer, unit, factor: 1 };
  const rule = TO_IMPERIAL[unit];
  if (!rule || MENTIONS_A_UNIT.test(questionText)) return { answer, unit, factor: 1 };
  const [newUnit, factor] = rule;
  return { answer: tidy(answer * factor), unit: newUnit, factor };
}

export function canConvert(unit: string): boolean {
  return Boolean(TO_IMPERIAL[unit]);
}
