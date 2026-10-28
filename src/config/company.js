// Single source of truth for company data. Injected into HTML at build time
// (see vite.config.js) and imported by src/main.js for runtime behaviour.

export const company = {
  name: 'Borluit Construction',
  tagline: 'Building Your Dream Home, One Brick at a Time.',
  description:
    'Professional residential-construction company in Assam, India, helping homeowners realize their dream homes through careful planning and attention to detail.',
  url: 'https://borluit-construction-website.vercel.app/',
  region: 'Assam, India',
  phone: {
    primary: { display: '+91 9101370326', e164: '+919101370326', digits: '919101370326' },
    secondary: { display: '+91 7002760846', e164: '+917002760846', digits: '917002760846' },
  },
  instagram: { url: 'https://www.instagram.com/borluitconstruction/', handle: '@borluitconstruction' },
  mapLink: 'https://www.google.com/maps/search/Assam,+India',
  capabilities: ['Residential Construction', 'Home Building', 'Planning & Coordination'],
};

export const conceptLabel = 'Illustrative residential concept';

// Gallery entries. One asset per entry; nothing here is completed client work.
export const concepts = [
  {
    id: 'hero-house',
    file: 'images/hero-house.webp',
    width: 1536,
    height: 1024,
    category: 'residence',
    title: 'Modern family home',
    description:
      'A two-storey concept with a shaded balcony, stone-clad columns and a front lawn among mature trees.',
  },
  {
    id: 'courtyard-house',
    file: 'images/courtyard-house.webp',
    width: 1536,
    height: 1024,
    category: 'residence',
    title: 'Courtyard residence',
    description:
      'A single-storey brick-and-render home whose covered verandah opens onto a planted courtyard.',
  },
  {
    id: 'planning-site',
    file: 'images/planning-site.webp',
    width: 1536,
    height: 1024,
    category: 'planning',
    title: 'Planning and site coordination',
    description:
      'A two-storey concrete frame with brick infill in progress, with drawings laid out on site.',
  },
  {
    id: 'contemporary-house',
    file: 'images/contemporary-house.webp',
    width: 1536,
    height: 1024,
    category: 'residence',
    title: 'Contemporary home',
    description:
      'White render, dark stone accents, a first-floor balcony and a gated drive on a compact plot.',
  },
];

export const categories = [
  { id: 'all', label: 'All concepts' },
  { id: 'residence', label: 'Residences' },
  { id: 'planning', label: 'Planning' },
];
