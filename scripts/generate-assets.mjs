// Derives favicon / touch icon / OG image from the supplied logo (entire image,
// proportional, letterboxed on charcoal) and responsive hero derivatives from
// the supplied hero image. Never touches the original logo.
import { existsSync } from 'node:fs';
import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = new URL('../', import.meta.url);
const pub = (p) => fileURLToPath(new URL(`public/${p}`, ROOT));
const LOGO = pub('brand/borluit-logo-original.jpg');
const EXPECTED_SHA = 'f83eb59b15636ae70755b5da8a675c42b13ecc25e4302fad66a3550b1661dc4d';
const CHARCOAL = { r: 34, g: 34, b: 34, alpha: 1 };

const logoBuffer = await readFile(LOGO);
const sha = createHash('sha256').update(logoBuffer).digest('hex');
if (sha !== EXPECTED_SHA) {
  console.error(`Logo hash mismatch: ${sha}`);
  process.exit(1);
}

async function squareIcon(size) {
  return sharp(logoBuffer)
    .resize(size, size, { fit: 'contain', background: CHARCOAL })
    .png()
    .toBuffer();
}

function pngToIco(png, size) {
  // ICO container with a single PNG-encoded entry (supported since Windows Vista).
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

const out = [];
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await writeFile(pub(name), await squareIcon(size));
  out.push(name);
}
await writeFile(pub('favicon.ico'), pngToIco(await squareIcon(32), 32));
out.push('favicon.ico');

// OG 1200x630: entire logo contained on charcoal.
await writeFile(
  pub('og-image.png'),
  await sharp(logoBuffer)
    .resize(1200, 630, { fit: 'contain', background: CHARCOAL })
    .png()
    .toBuffer(),
);
out.push('og-image.png');

// Responsive hero derivatives, only if the studio asset exists.
const hero = pub('images/hero-house.webp');
if (existsSync(hero)) {
  const meta = await sharp(hero).metadata();
  for (const w of [960, 1440]) {
    if (meta.width > w) {
      const name = `images/hero-house-${w}.webp`;
      await sharp(hero).resize({ width: w }).webp({ quality: 80 }).toFile(pub(name));
      out.push(name);
    }
  }
} else {
  console.warn('hero-house.webp not present; skipped responsive hero derivatives.');
}

// Report intrinsic sizes of any studio images so company.js can be kept accurate.
for (const f of ['hero-house', 'courtyard-house', 'planning-site', 'contemporary-house']) {
  const p = pub(`images/${f}.webp`);
  if (existsSync(p)) {
    const m = await sharp(p).metadata();
    console.log(`${f}.webp ${m.width}x${m.height}`);
  } else {
    console.warn(`MISSING studio asset: public/images/${f}.webp`);
  }
}

console.log(`Generated: ${out.join(', ')}`);
