import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');

// Master rounded SVG
const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#0B0B0B"/>
<g transform="translate(-24,-4)">
<rect x="158" y="96" width="36" height="214" rx="18" fill="#F5F5F0"/>
<circle cx="280" cy="310" r="104" fill="none" stroke="#F5F5F0" stroke-width="36"/>
<circle cx="280" cy="310" r="50" fill="none" stroke="#F5F5F0" stroke-width="28"/>
<circle cx="280" cy="310" r="14" fill="#F5F5F0"/>
<circle cx="335" cy="255" r="19" fill="#C6F432"/>
</g>
</svg>`;

// Full bleed square SVG (no rx)
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0B0B0B"/>
<g transform="translate(-24,-4)">
<rect x="158" y="96" width="36" height="214" rx="18" fill="#F5F5F0"/>
<circle cx="280" cy="310" r="104" fill="none" stroke="#F5F5F0" stroke-width="36"/>
<circle cx="280" cy="310" r="50" fill="none" stroke="#F5F5F0" stroke-width="28"/>
<circle cx="280" cy="310" r="14" fill="#F5F5F0"/>
<circle cx="335" cy="255" r="19" fill="#C6F432"/>
</g>
</svg>`;

// Maskable SVG (scale artwork down to 80% around the center: scale 0.8, translate (512*(1-0.8)/2 = 51.2))
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0B0B0B"/>
<g transform="translate(51.2, 51.2) scale(0.8)">
<g transform="translate(-24,-4)">
<rect x="158" y="96" width="36" height="214" rx="18" fill="#F5F5F0"/>
<circle cx="280" cy="310" r="104" fill="none" stroke="#F5F5F0" stroke-width="36"/>
<circle cx="280" cy="310" r="50" fill="none" stroke="#F5F5F0" stroke-width="28"/>
<circle cx="280" cy="310" r="14" fill="#F5F5F0"/>
<circle cx="335" cy="255" r="19" fill="#C6F432"/>
</g>
</g>
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
