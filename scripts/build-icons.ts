import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');

// The Ballpark mark: a ballpark seen from above, with the ball sailing over the outfield wall.
// Home plate sits at the bottom, the wall is the lime arc, and the ball has just cleared it.
function artwork(): string {
  // Field wedge from home plate (256, 430), radius 236, 45 degrees either side
  const hx = 256;
  const hy = 430;
  const r = 236;
  const d = r * Math.SQRT1_2;
  const lx = (hx - d).toFixed(1);
  const rx = (hx + d).toFixed(1);
  const ty = (hy - d).toFixed(1);
  return `
<path d="M ${hx} ${hy} L ${lx} ${ty} A ${r} ${r} 0 0 1 ${rx} ${ty} Z" fill="#173D24"/>
<path d="M ${hx} ${hy} L ${hx - 62} ${hy - 62} L ${hx} ${hy - 124} L ${hx + 62} ${hy - 62} Z" fill="#4A3426"/>
<path d="M ${hx} ${hy - 22} L ${hx - 42} ${hy - 62} L ${hx} ${hy - 102} L ${hx + 42} ${hy - 62} Z" fill="#1F4D2E"/>
<path d="M ${lx} ${ty} A ${r} ${r} 0 0 1 ${rx} ${ty}" fill="none" stroke="#C6F432" stroke-width="22" stroke-linecap="round"/>
<path d="M ${hx} ${hy - 6} Q 300 120 386 96" fill="none" stroke="#F5F5F0" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 22"/>
<circle cx="392" cy="92" r="36" fill="#F5F5F0"/>
<path d="M 372 66 Q 384 92 372 118 M 412 66 Q 400 92 412 118" fill="none" stroke="#E0503F" stroke-width="5" stroke-linecap="round"/>
<path d="M ${hx - 9} ${hy - 12} h 18 v 9 l -9 9 l -9 -9 Z" fill="#F5F5F0"/>`;
}

const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#0B0B0B"/>${artwork()}
</svg>`;

// Full bleed square (iOS and Android add their own rounding)
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0B0B0B"/>${artwork()}
</svg>`;

// Maskable: artwork at 80% so Android's circle or squircle crop never cuts the ball off
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0B0B0B"/>
<g transform="translate(51.2, 51.2) scale(0.8)">${artwork()}</g>
</svg>`;

function renderPng(svgString: string, size: number): Buffer {
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

async function buildIcons() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Save SVG logo and favicon
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), masterSvg, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), masterSvg, 'utf-8');

  // favicon-32.png (rounded version)
  fs.writeFileSync(path.join(publicDir, 'favicon-32.png'), renderPng(masterSvg, 32));

  // apple-touch-icon.png (180x180 square)
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderPng(squareSvg, 180));

  // icon-192.png (192x192 square)
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), renderPng(squareSvg, 192));

  // icon-512.png (512x512 square)
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), renderPng(squareSvg, 512));

  // maskable-512.png (512x512 maskable)
  fs.writeFileSync(path.join(publicDir, 'maskable-512.png'), renderPng(maskableSvg, 512));

  console.log('Icons generated successfully in public/');
}

buildIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
