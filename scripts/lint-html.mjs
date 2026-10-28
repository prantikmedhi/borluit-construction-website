// Lightweight structural checks for the source HTML (no extra dependency).
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const files = ['index.html', '404.html'];
let failed = 0;

function fail(file, msg) {
  failed += 1;
  console.error(`FAIL ${file}: ${msg}`);
}

for (const file of files) {
  const html = await readFile(new URL(file, ROOT), 'utf8');
  const h1 = (html.match(/<h1\b/g) || []).length;
  if (h1 !== 1) fail(file, `expected exactly one <h1>, found ${h1}`);
  if (!/<html lang="en">/.test(html)) fail(file, 'missing lang attribute');
  if (!/<meta name="viewport"/.test(html)) fail(file, 'missing viewport meta');
  if (!/<title>/.test(html)) fail(file, 'missing <title>');
  if (!/<main\b/.test(html)) fail(file, 'missing <main>');

  // Every <img> must carry alt, width and height.
  for (const tag of html.match(/<img\b[^>]*>/g) || []) {
    for (const attr of ['alt', 'width', 'height']) {
      if (!new RegExp(`\\s${attr}=`).test(tag)) fail(file, `<img> missing ${attr}: ${tag.slice(0, 80)}`);
    }
  }

  // Every input/textarea must have a matching <label for>.
  for (const tag of html.match(/<(input|textarea)\b[^>]*>/g) || []) {
    const id = tag.match(/\sid="([^"]+)"/)?.[1];
    if (!id || !html.includes(`<label for="${id}"`)) fail(file, `control without label: ${tag.slice(0, 60)}`);
  }

  // Unresolved template keys.
  if (file === 'index.html') {
    if (!/<link rel="canonical"/.test(html)) fail(file, 'missing canonical');
    if (!/property="og:image"/.test(html)) fail(file, 'missing og:image');
    if (!/application\/ld\+json/.test(html)) fail(file, 'missing JSON-LD');
  }
}

if (failed) process.exit(1);
console.log('HTML checks passed.');
