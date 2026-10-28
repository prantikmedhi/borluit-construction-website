// Deterministic Playwright QA against the production build (dist/).
// Runs `vite preview`, blocks every non-local request, exercises the UI at
// four viewports, writes screenshots + report to qa-artifacts/.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { company, concepts } from '../src/config/company.js';

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('../qa-artifacts/', import.meta.url);
const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568, mobile: true },
  { name: '390x844', width: 390, height: 844, mobile: true },
  { name: '768x1024', width: 768, height: 1024, mobile: true },
  { name: '1440x1000', width: 1440, height: 1000, mobile: false },
];
const SECTIONS = ['about', 'services', 'concepts', 'why-us', 'process', 'contact'];

const report = { startedAt: new Date().toISOString(), viewports: {}, failures: [] };
const fail = (vp, msg) => {
  report.failures.push(`[${vp}] ${msg}`);
  console.error(`FAIL [${vp}] ${msg}`);
};
const pass = (vp, msg) => console.log(`ok   [${vp}] ${msg}`);

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server at ${url} did not start`);
}

await mkdir(OUT, { recursive: true });

// Minimal static server mirroring Vercel's static behaviour: cleanUrls and a
// real 404 status with 404.html for unknown routes (no SPA fallback).
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ missing. Run `npm run build` first.');
  process.exit(1);
}
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, BASE).pathname);
  let file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) file = '';
  if (file && existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (file && !existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!file || !existsSync(file)) {
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    createReadStream(join(DIST, '404.html')).pipe(res);
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
server.listen(PORT);
try {
  await waitForServer(BASE);
  // Prefer bundled Chromium; fall back to an installed Google Chrome.
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));

  // 404 route must return a real 404 with branded body.
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const res = await page.goto(`${BASE}/definitely-not-a-page`);
    const status = res?.status();
    const branded = await page.locator('h1').textContent().catch(() => '');
    if (status === 404 && /not built yet/i.test(branded || '')) pass('404', `status ${status}, branded page`);
    else fail('404', `expected 404 + branded page, got status ${status}, h1 "${branded}"`);
    await ctx.close();
  }

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      hasTouch: vp.mobile,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const external = [];
    const failedRequests = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('pageerror', (e) => consoleErrors.push(e.message));
    page.on('requestfailed', (r) => failedRequests.push(r.url()));
    await ctx.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith(BASE)) return route.continue();
      external.push(url);
      return route.abort();
    });

    const result = (report.viewports[vp.name] = {});
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

    // Overflow
    const overflow = await page.evaluate(() => ({
      scroll: document.scrollingElement.scrollWidth,
      inner: window.innerWidth,
    }));
    result.overflow = overflow;
    if (overflow.scroll > overflow.inner) fail(vp.name, `horizontal overflow ${overflow.scroll} > ${overflow.inner}`);
    else pass(vp.name, 'no horizontal overflow');

    // Hero CTAs in first screen (before scrolling)
    const ctas = page.locator('.hero__actions a');
    const boxes = await Promise.all([0, 1].map((i) => ctas.nth(i).boundingBox()));
    const inView = boxes.every((b) => b && b.y >= 0 && b.y + b.height <= vp.height && b.x + b.width <= vp.width);
    result.heroCtas = boxes;
    if (inView) pass(vp.name, 'both hero CTAs inside first screen');
    else fail(vp.name, `hero CTAs not within first screen: ${JSON.stringify(boxes)}`);

    if (!vp.mobile) {
      const layout = await page.evaluate(() => {
        const h1 = document.querySelector('.hero__title');
        const links = [...document.querySelectorAll('.site-nav__list a')];
        return {
          headlineLines: h1.getBoundingClientRect().height / parseFloat(window.getComputedStyle(h1).lineHeight),
          headerHeight: document.querySelector('header').getBoundingClientRect().height,
          navRows: new Set(links.map((a) => Math.round(a.getBoundingClientRect().top))).size,
        };
      });
      if (layout.headlineLines <= 2.1 && layout.headerHeight <= 80 && layout.navRows === 1)
        pass(vp.name, 'desktop headline two lines and compact single-row navigation');
      else fail(vp.name, `desktop layout: ${JSON.stringify(layout)}`);
    }
    const logoStyles = await page.locator('.brand__logo, .site-footer__logo').evaluateAll((els) =>
      els.every((e) => window.getComputedStyle(e).objectFit === 'contain' && window.getComputedStyle(e).borderRadius === '0px'),
    );
    if (logoStyles) pass(vp.name, 'original logos contained without clipping or rounded corners');
    else fail(vp.name, 'original logo styling may clip the supplied image');

    await page.screenshot({ path: fileURLToPath(new URL(`${vp.name}-hero.png`, OUT)) });

    // Anchors
    const badAnchors = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => h.length > 1 && !document.querySelector(h)),
    );
    if (badAnchors.length) fail(vp.name, `broken anchors: ${badAnchors.join(', ')}`);
    else pass(vp.name, 'all in-page anchors resolve');

    // Phone targets
    for (const key of ['primary', 'secondary']) {
      const n = await page.locator(`a[href="tel:${company.phone[key].e164}"]`).count();
      if (n >= 2) pass(vp.name, `${key} phone tel: link present (${n})`);
      else fail(vp.name, `${key} phone tel: link count ${n}`);
    }

    // Sections visible after scrolling + screenshots (sticky header unpinned
    // only while clipping so it does not paint over every section image).
    await page.evaluate(() => {
      const s = document.createElement('style');
      s.id = 'qa-unstick';
      s.textContent = '.site-header{position:static}';
      document.head.append(s);
    });
    for (const id of [...SECTIONS, 'footer']) {
      const sel = id === 'footer' ? 'footer' : `#${id}`;
      const loc = page.locator(sel);
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      const box = await loc.boundingBox();
      const visible = box && box.y < vp.height && box.y + box.height > 0;
      if (visible) pass(vp.name, `section ${id} visible after scroll`);
      else fail(vp.name, `section ${id} not visible after scroll`);
      if (box) {
        const h = Math.min(box.height, 2990);
        await page.screenshot({
          path: fileURLToPath(new URL(`${vp.name}-${id}.png`, OUT)),
          fullPage: true,
          clip: { x: 0, y: box.y + (await page.evaluate(() => window.scrollY)), width: vp.width, height: h },
        });
      }
    }
    await page.evaluate(() => document.getElementById('qa-unstick')?.remove());

    // Images
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 10000 }).catch(() => {});
    const images = await page.evaluate(() =>
      [...document.images].map((i) => ({
        src: i.getAttribute('src'),
        ok: i.complete && i.naturalWidth > 0,
        alt: i.alt,
        hasDims: i.hasAttribute('width') && i.hasAttribute('height'),
      })),
    );
    result.images = images;
    const broken = images.filter((i) => !i.ok && i.src);
    const dimless = images.filter((i) => !i.hasDims);
    if (broken.length) fail(vp.name, `broken images: ${broken.map((b) => b.src).join(', ')}`);
    else pass(vp.name, `${images.length} images loaded`);
    if (dimless.length) fail(vp.name, `images without width/height: ${dimless.map((d) => d.src).join(', ')}`);


    // Filters
    await page.locator('#concepts').scrollIntoViewIfNeeded();
    const countVisible = () => page.locator('#concept-grid .concept:visible').count();
    await page.locator('.filter[data-filter="planning"]').click();
    const planningCount = await countVisible();
    const expectedPlanning = concepts.filter((c) => c.category === 'planning').length;
    const pressed = await page.locator('.filter[data-filter="planning"]').getAttribute('aria-pressed');
    const allPressed = await page.locator('.filter[data-filter="all"]').getAttribute('aria-pressed');
    if (planningCount === expectedPlanning && pressed === 'true' && allPressed === 'false')
      pass(vp.name, `filter planning shows ${planningCount}`);
    else fail(vp.name, `filter planning: ${planningCount}/${expectedPlanning}, pressed=${pressed}, all=${allPressed}`);
    await page.locator('.filter[data-filter="residence"]').click();
    const resCount = await countVisible();
    if (resCount === concepts.filter((c) => c.category === 'residence').length) pass(vp.name, `filter residence shows ${resCount}`);
    else fail(vp.name, `filter residence shows ${resCount}`);
    await page.locator('.filter[data-filter="all"]').click();
    const allCount = await countVisible();
    if (allCount === concepts.length) pass(vp.name, `filter all shows ${allCount}`);
    else fail(vp.name, `filter all shows ${allCount}`);

    // Dialog: open, Escape, focus restore
    const firstConcept = page.locator('#concept-grid .concept__button').first();
    await firstConcept.click();
    const dialog = page.locator('#concept-dialog');
    const opened = await dialog.evaluate((d) => d.open);
    const dialogTitle = await page.locator('#dialog-title').textContent();
    if (opened && dialogTitle === concepts[0].title) pass(vp.name, `dialog opened "${dialogTitle}"`);
    else fail(vp.name, `dialog open=${opened} title="${dialogTitle}"`);
    await page.screenshot({ path: fileURLToPath(new URL(`${vp.name}-dialog.png`, OUT)) });
    await page.keyboard.press('Escape');
    const closed = await dialog.evaluate((d) => !d.open);
    const focusRestored = await page.evaluate(() => document.activeElement?.dataset.concept === 'hero-house');
    if (closed && focusRestored) pass(vp.name, 'dialog closed via Escape, focus restored');
    else fail(vp.name, `dialog closed=${closed} focusRestored=${focusRestored}`);

    // Mobile menu
    const toggleVisible = await page.locator('#menu-toggle').isVisible();
    if (toggleVisible) {
      await page.locator('#top').scrollIntoViewIfNeeded();
      await page.locator('#menu-toggle').focus();
      await page.keyboard.press('Enter');
      const expanded = await page.locator('#menu-toggle').getAttribute('aria-expanded');
      const navVisible = await page.locator('#primary-nav').isVisible();
      if (expanded === 'true' && navVisible) pass(vp.name, 'menu opened by keyboard');
      else fail(vp.name, `menu open expanded=${expanded} visible=${navVisible}`);
      await page.screenshot({ path: fileURLToPath(new URL(`${vp.name}-menu.png`, OUT)) });
      await page.keyboard.press('Escape');
      const afterEsc = await page.locator('#menu-toggle').getAttribute('aria-expanded');
      const focusOnToggle = await page.evaluate(() => document.activeElement?.id === 'menu-toggle');
      if (afterEsc === 'false' && focusOnToggle) pass(vp.name, 'menu closed by Escape, focus restored');
      else fail(vp.name, `menu Escape expanded=${afterEsc} focus=${focusOnToggle}`);
      await page.locator('#menu-toggle').click();
      await page.locator('#primary-nav a[href="#process"]').click();
      await page.waitForTimeout(150);
      const afterNav = await page.locator('#menu-toggle').getAttribute('aria-expanded');
      if (afterNav === 'false') pass(vp.name, 'menu closed after navigation');
      else fail(vp.name, 'menu stayed open after navigation');
    } else if (vp.mobile) {
      fail(vp.name, 'menu toggle not visible on mobile viewport');
    } else {
      const navVisible = await page.locator('#primary-nav').isVisible();
      if (navVisible) pass(vp.name, 'desktop nav visible, toggle hidden');
      else fail(vp.name, 'desktop nav hidden');
    }

    // Form: invalid rejection
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.locator('#contact-form .form__submit').click();
    const draftHiddenAfterInvalid = await page.locator('#draft').isHidden();
    const errorCount = await page.locator('.field__error:not(:empty)').count();
    if (draftHiddenAfterInvalid && errorCount === 4) pass(vp.name, 'empty form rejected with 4 errors');
    else fail(vp.name, `empty form: draftHidden=${draftHiddenAfterInvalid} errors=${errorCount}`);
    await page.fill('#f-phone', '12');
    await page.locator('#contact-form .form__submit').click();
    const phoneErr = await page.locator('#f-phone-error').textContent();
    if (phoneErr) pass(vp.name, 'bad phone rejected');
    else fail(vp.name, 'bad phone accepted');

    // Form: valid -> draft prepared, not sent
    const data = { name: 'Test Person', phone: '+91 98765 43210', location: 'Jorhat', message: 'Planning a two-storey family home.' };
    await page.fill('#f-name', data.name);
    await page.fill('#f-phone', data.phone);
    await page.fill('#f-location', data.location);
    await page.fill('#f-message', data.message);
    await page.locator('#contact-form .form__submit').click();
    const draftVisible = await page.locator('#draft').isVisible();
    const draftTxt = (await page.locator('#draft-text').textContent()) || '';
    const href = (await page.locator('#draft-link').getAttribute('href')) || '';
    const expectedPrefix = `https://wa.me/${company.phone.primary.digits}?text=`;
    const decoded = href.startsWith(expectedPrefix) ? decodeURIComponent(href.slice(expectedPrefix.length)) : '';
    const textOk = [data.name, data.phone, data.location, data.message, company.name].every((s) => draftTxt.includes(s));
    const fieldsKept = (await page.inputValue('#f-message')) === data.message;
    result.draft = { href, text: draftTxt };
    if (draftVisible && textOk && decoded === draftTxt && fieldsKept) pass(vp.name, 'WhatsApp draft prepared with correct number and text; fields preserved');
    else fail(vp.name, `draft visible=${draftVisible} textOk=${textOk} hrefMatches=${decoded === draftTxt} fieldsKept=${fieldsKept}`);
    const statusCopy = await page.locator('.draft__status').textContent();
    if (/not sent/i.test(statusCopy || '')) pass(vp.name, 'draft states not sent');
    else fail(vp.name, 'draft status copy missing "not sent"');
    await page.screenshot({ path: fileURLToPath(new URL(`${vp.name}-draft.png`, OUT)) });

    // Errors and network
    result.consoleErrors = consoleErrors;
    result.external = external;
    result.failedRequests = failedRequests;
    if (consoleErrors.length) fail(vp.name, `console errors: ${consoleErrors.join(' | ')}`);
    else pass(vp.name, 'no console/page errors');
    if (external.length) fail(vp.name, `external requests attempted: ${[...new Set(external)].join(', ')}`);
    else pass(vp.name, 'no external requests');
    if (failedRequests.length) fail(vp.name, `failed requests: ${[...new Set(failedRequests)].join(', ')}`);

    await ctx.close();
  }
  await browser.close();
} finally {
  server.close();
}

report.finishedAt = new Date().toISOString();
await writeFile(new URL('report.json', OUT), JSON.stringify(report, null, 2));
const md = [
  `# QA report`,
  ``,
  `Run: ${report.startedAt}`,
  `Failures: ${report.failures.length}`,
  ``,
  ...report.failures.map((f) => `- ${f}`),
].join('\n');
await writeFile(new URL('report.md', OUT), md);
console.log(`\n${report.failures.length} failure(s). Report: qa-artifacts/report.md`);
process.exit(report.failures.length ? 1 : 0);
