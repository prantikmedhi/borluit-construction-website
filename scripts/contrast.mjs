// WCAG 2.x contrast check for every colour pairing used in the stylesheet.
const pairs = [
  // [label, fg, bg, min ratio]
  ['Charcoal headings on white', '#222222', '#FFFFFF', 4.5],
  ['Body gray on white', '#555B5D', '#FFFFFF', 4.5],
  ['Body gray on off-white', '#555B5D', '#F7F8F7', 4.5],
  ['Dark teal small labels on white', '#32696D', '#FFFFFF', 4.5],
  ['Dark teal small labels on off-white', '#32696D', '#F7F8F7', 4.5],
  ['White on primary teal (19px/700 large text)', '#FFFFFF', '#4A898D', 3],
  ['White on dark teal hover (large)', '#FFFFFF', '#32696D', 3],
  ['Muted gray on charcoal', '#B9BFBE', '#222222', 4.5],
  ['White on charcoal', '#FFFFFF', '#222222', 4.5],
  ['Teal footer links on charcoal (19px/700 large text)', '#4A898D', '#222222', 3],
  ['Error red on white', '#B3261E', '#FFFFFF', 4.5],
  ['Charcoal on off-white', '#222222', '#F7F8F7', 4.5],
  ['Primary teal step number text white (large)', '#FFFFFF', '#4A898D', 3],
];

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

let failed = 0;
for (const [label, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${r.toFixed(2)}:1 (min ${min}) ${label}`);
}
if (failed) {
  console.error(`${failed} contrast pair(s) failed`);
  process.exit(1);
}
