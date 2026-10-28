# Borluit Construction website

Static brochure site for Borluit Construction, a residential builder in Assam, India. Plain HTML, modular CSS and vanilla JavaScript, built with Vite.

## Commands

```sh
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
npm run lint       # eslint + HTML structure checks
npm run contrast   # WCAG contrast check of palette pairings
npm run assets     # favicon / OG / hero derivatives from supplied material
npm run qa         # Playwright checks + screenshots at 4 widths -> qa-artifacts/
npm run check      # lint, build, contrast, qa
```

## Where things live

- `src/config/company.js`: phones, Instagram, URL, concept descriptions. Injected into HTML at build time.
- `public/images/`: AI-generated illustrative residential concepts, not completed client-project photography. Replace these with approved company photographs when available.
- `public/brand/borluit-logo-original.jpg`: untouched original logo.
- `public/fonts/`: self-hosted Manrope (SIL OFL 1.1, licence included).
- `scripts/`: asset generation, contrast and QA scripts. QA output goes to `qa-artifacts/` (gitignored).

The contact form prepares a WhatsApp draft on the visitor's device. Nothing is sent or stored by the site.
