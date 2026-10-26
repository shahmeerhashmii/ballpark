// Draws the shareable results picture (1080 x 1350, the 4:5 size Instagram, iMessage and X all show well).
// Everything is drawn on a canvas in the browser, so it works offline and needs no server.

import { QuestionGuessResult, GameMode } from '../types';
import { getTierByKey, getEasyOutcome, WALL_FEET } from './scoring';

const W = 1080;
const H = 1350;
const C = {
  bg: '#0B0B0B',
  text: '#F5F5F0',
  muted: '#9A9A92',
  accent: '#C6F432',
  grass: '#173D24',
  grassEdge: '#0F2A18',
  dirt: '#4A3426',
  chalk: '#EDEDE4',
  stands: '#161616',
  crowd: '#2A2A2A',
};

// Canvas can't read CSS variables, so tier colours are mapped to their hex values here
const HEX: Record<string, string> = {
  'var(--color-result-green)': '#C6F432',
  'var(--color-result-yellow)': '#F2C14E',
  'var(--color-result-orange)': '#FF9F43',
  'var(--color-result-white)': '#D9D9CF',
  'var(--color-result-red)': '#FF5A4F',
  'var(--color-result-miss)': '#5E5E58',
};
const hex = (v: string) => HEX[v] ?? v;

const DISPLAY = '"Bricolage Grotesque", -apple-system, "Segoe UI", Roboto, sans-serif';
const BODY = '"Instrument Sans", -apple-system, "Segoe UI", Roboto, sans-serif';

interface CardInput {
  dayNumber: number;
  mode: GameMode;
  guesses: QuestionGuessResult[];
  ratingTitle: string;
  bigNumber: string; // "1,598" or "4"
  bigLabel: string; // "ft of 2,250" or "of 5 right"
  url: string;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareCard(input: CardInput): Promise<Blob> {
  // Make sure the game's fonts are ready, or the canvas silently falls back to system fonts
  try {
    await Promise.all([
      document.fonts.load(`800 120px ${DISPLAY}`),
      document.fonts.load(`700 40px ${DISPLAY}`),
      document.fonts.load(`600 30px ${BODY}`),
    ]);
  } catch {
    // system fonts are fine as a fallback
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  // Background with a soft stadium-light glow
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 760, 50, W / 2, 760, 760);
  glow.addColorStop(0, 'rgba(23, 61, 36, 0.55)');
  glow.addColorStop(1, 'rgba(11, 11, 11, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = C.accent;
  ctx.font = `800 52px ${DISPLAY}`;
  ctx.fillText(`Ballpark #${input.dayNumber}`, W / 2, 130);
  if (input.mode === 'easy') {
    ctx.font = `700 26px ${BODY}`;
    const label = 'EASY MODE';
    const tw = ctx.measureText(label).width + 40;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 3;
    roundRect(ctx, W / 2 - tw / 2, 156, tw, 46, 23);
    ctx.stroke();
    ctx.fillText(label, W / 2, 189);
  }

  // Field
  const hx = W / 2;
  const hy = 770;
  const WALL_PX = 410;
  const px = WALL_PX / WALL_FEET; // pixels per foot
  const toXY = (feet: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: hx + feet * px * Math.sin(a), y: hy - feet * px * Math.cos(a) };
  };
  const sector = (r: number, from: number, to: number) => {
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.arc(hx, hy, r, -Math.PI / 2 + (from * Math.PI) / 180, -Math.PI / 2 + (to * Math.PI) / 180);
    ctx.closePath();
  };
  // stands with a dotted crowd
  sector(WALL_PX + 80, -50, 50);
  ctx.fillStyle = C.stands;
  ctx.fill();
  ctx.save();
  sector(WALL_PX + 80, -50, 50);
  ctx.clip();
  ctx.fillStyle = C.crowd;
  for (let y = 200; y < hy; y += 14) {
    for (let x = 80; x < W - 80; x += 14) {
      const d = Math.hypot(x - hx, y - hy);
      if (d > WALL_PX + 12 && d < WALL_PX + 80) {
        ctx.beginPath();
        ctx.arc(x + ((y / 14) % 2) * 7, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  // grass
  const g = ctx.createRadialGradient(hx, hy, 20, hx, hy, WALL_PX);
  g.addColorStop(0, C.grass);
  g.addColorStop(1, C.grassEdge);
  sector(WALL_PX, -45, 45);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  sector(WALL_PX, -45, 45);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 26;
  for (let r = 100; r < WALL_PX; r += 66) {
    ctx.beginPath();
    ctx.arc(hx, hy, r, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
  }
  ctx.restore();
  // infield
  sector(150 * px, -45, 45);
  ctx.fillStyle = C.dirt;
  ctx.fill();
  const ig = [toXY(10, 0), toXY(80, 41), toXY(116, 0), toXY(80, -41)];
  ctx.beginPath();
  ig.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = C.grass;
  ctx.fill();
  // foul lines and wall
  ctx.strokeStyle = C.chalk;
  ctx.lineWidth = 3;
  [-45, 45].forEach((d) => {
    const p = toXY(WALL_FEET, d);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(hx, hy, WALL_PX, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = C.accent;
  ctx.font = `800 24px ${DISPLAY}`;
  ctx.fillText('400', hx, hy - WALL_PX + 34);

  // Hits
  input.guesses.forEach((r, i) => {
    let feet = r.feet;
    let color = hex(getTierByKey(r.tier).color);
    if (input.mode === 'easy') {
      const o = getEasyOutcome(r.points);
      feet = o.visualFeet;
      color = hex(o.color);
    }
    const p = feet > 0 ? toXY(feet, r.sprayAngle) : { x: hx + (i - 2) * 34, y: hy - 30 };
    if (feet > 0) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([4, 10]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.bg;
    ctx.font = `800 22px ${DISPLAY}`;
    ctx.fillText(String(i + 1), p.x, p.y + 8);
  });

  // Score
  ctx.fillStyle = C.text;
  ctx.font = `800 128px ${DISPLAY}`;
  const bigW = ctx.measureText(input.bigNumber).width;
  ctx.font = `700 38px ${DISPLAY}`;
  const labelW = ctx.measureText(input.bigLabel).width;
  const startX = W / 2 - (bigW + 16 + labelW) / 2;
  ctx.textAlign = 'left';
  ctx.font = `800 128px ${DISPLAY}`;
  ctx.fillText(input.bigNumber, startX, 925);
  ctx.fillStyle = C.muted;
  ctx.font = `700 38px ${DISPLAY}`;
  ctx.fillText(input.bigLabel, startX + bigW + 16, 925);
  ctx.textAlign = 'center';

  // Rating pill
  ctx.font = `700 38px ${DISPLAY}`;
  const pillW = ctx.measureText(input.ratingTitle).width + 64;
  ctx.fillStyle = 'rgba(198, 244, 50, 0.12)';
  roundRect(ctx, W / 2 - pillW / 2, 960, pillW, 66, 33);
  ctx.fill();
  ctx.fillStyle = C.accent;
  ctx.fillText(input.ratingTitle, W / 2, 1006);

  // Five tiles
  const tileW = 168;
  const gap = 18;
  const rowX = W / 2 - (tileW * 5 + gap * 4) / 2;
  input.guesses.forEach((r, i) => {
    const x = rowX + i * (tileW + gap);
    let color = hex(getTierByKey(r.tier).color);
    let label = `${r.feet}`;
    let small = 'ft';
    if (input.mode === 'easy') {
      const o = getEasyOutcome(r.points);
      color = hex(o.color);
      label = o.key === 'right' ? '✓' : o.key === 'close' ? '≈' : '✗';
      small = '';
    }
    ctx.fillStyle = color;
    roundRect(ctx, x, 1066, tileW, 104, 20);
    ctx.fill();
    ctx.fillStyle = C.bg;
    ctx.font = `800 44px ${DISPLAY}`;
    ctx.fillText(label, x + tileW / 2 - (small ? 12 : 0), 1133);
    if (small) {
      ctx.font = `700 24px ${BODY}`;
      ctx.fillStyle = 'rgba(11,11,11,0.65)';
      ctx.fillText(small, x + tileW / 2 + ctx.measureText(label).width / 2 + 24, 1133);
    }
  });

  // Footer
  ctx.fillStyle = C.muted;
  ctx.font = `600 30px ${BODY}`;
  ctx.fillText('Guess the number. Hit it out of the park.', W / 2, 1258);
  ctx.fillStyle = C.text;
  ctx.font = `700 32px ${BODY}`;
  ctx.fillText(input.url, W / 2, 1302);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png')
  );
}
