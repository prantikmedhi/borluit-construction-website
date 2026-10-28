import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { company, concepts, conceptLabel, categories } from './src/config/company.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function conceptCards() {
  return concepts
    .map(
      (c) => `
        <li class="concept" data-category="${c.category}">
          <button type="button" class="concept__button" data-concept="${c.id}" aria-haspopup="dialog">
            <img src="/${c.id === 'hero-house' ? 'images/hero-house-960.webp' : c.file}" ${c.id === 'hero-house' ? 'srcset="/images/hero-house-960.webp 960w, /images/hero-house-1440.webp 1440w, /images/hero-house.webp 1536w" sizes="(min-width: 960px) 60vw, 100vw"' : ''} alt="${esc(conceptLabel)}: ${esc(c.title)}. ${esc(c.description)}" width="${c.width}" height="${c.height}" loading="lazy" fetchpriority="low" decoding="async">
            <span class="concept__meta">
              <span class="concept__title">${esc(c.title)}</span>
              <span class="concept__label">${esc(conceptLabel)}</span>
            </span>
          </button>
        </li>`,
    )
    .join('');
}

function filterButtons() {
  return categories
    .map(
      (c) =>
        `<button type="button" class="filter" data-filter="${c.id}" aria-pressed="${c.id === 'all'}">${esc(c.label)}</button>`,
    )
    .join('\n          ');
}

const values = {
  'company.name': company.name,
  'company.tagline': company.tagline,
  'company.description': company.description,
  'company.url': company.url,
  'company.region': company.region,
  'phone.primary.display': company.phone.primary.display,
  'phone.primary.e164': company.phone.primary.e164,
  'phone.primary.digits': company.phone.primary.digits,
  'phone.secondary.display': company.phone.secondary.display,
  'phone.secondary.e164': company.phone.secondary.e164,
  'instagram.url': company.instagram.url,
  'instagram.handle': company.instagram.handle,
  'mapLink': company.mapLink,
  'conceptLabel': conceptLabel,
  'concepts': conceptCards(),
  'filters': filterButtons(),
  'heroImage': concepts[0].file,
};

function companyData() {
  return {
    name: 'company-data',
    transformIndexHtml(html) {
      return html.replace(/\{\{([\w.]+)\}\}/g, (m, key) => {
        if (!(key in values)) throw new Error(`Unknown template key ${key}`);
        return values[key];
      });
    },
  };
}

export default defineConfig({
  appType: 'mpa', // no SPA fallback: unknown routes are real 404s
  plugins: [companyData()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        notFound: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
});
