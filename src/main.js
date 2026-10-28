import { company, concepts, conceptLabel } from './config/company.js';

/* ---------- Mobile menu ---------- */
const toggle = document.getElementById('menu-toggle');
const nav = document.getElementById('primary-nav');

function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  nav.dataset.open = String(open);
}

function closeMenu({ restoreFocus = false } = {}) {
  if (toggle.getAttribute('aria-expanded') !== 'true') return;
  setMenu(false);
  if (restoreFocus) toggle.focus();
}

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  setMenu(!open);
  if (!open) nav.querySelector('a')?.focus();
});

nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu({ restoreFocus: true });
});

document.addEventListener('click', (e) => {
  if (!nav.contains(e.target) && !toggle.contains(e.target)) closeMenu();
});

/* ---------- Active nav underline ---------- */
const navLinks = [...nav.querySelectorAll('.site-nav__list a')];
const sections = navLinks
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const visible = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) visible.set(entry.target.id, entry.intersectionRatio);
      let bestId = null;
      let best = 0;
      for (const [id, ratio] of visible) {
        if (ratio > best) {
          best = ratio;
          bestId = id;
        }
      }
      for (const a of navLinks) {
        const current = bestId && a.getAttribute('href') === `#${bestId}`;
        if (current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
  );
  sections.forEach((s) => observer.observe(s));
}

/* ---------- Concept filters ---------- */
const grid = document.getElementById('concept-grid');
const empty = document.getElementById('concept-empty');
const filterButtons = [...document.querySelectorAll('.filter')];

function applyFilter(category) {
  let shown = 0;
  for (const item of grid.querySelectorAll('.concept')) {
    const match = category === 'all' || item.dataset.category === category;
    item.hidden = !match;
    if (match) shown += 1;
  }
  empty.hidden = shown > 0;
  for (const b of filterButtons) b.setAttribute('aria-pressed', String(b.dataset.filter === category));
}

filterButtons.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));

/* ---------- Concept dialog ---------- */
const dialog = document.getElementById('concept-dialog');
const dialogImage = document.getElementById('dialog-image');
const dialogTitle = document.getElementById('dialog-title');
const dialogDescription = document.getElementById('dialog-description');
let opener = null;

if (typeof HTMLDialogElement === 'function') {
  grid.addEventListener('click', (e) => {
    const button = e.target.closest('[data-concept]');
    if (!button) return;
    const concept = concepts.find((c) => c.id === button.dataset.concept);
    if (!concept) return;
    opener = button;
    dialogImage.src = `/${concept.file}`;
    dialogImage.width = concept.width;
    dialogImage.height = concept.height;
    dialogImage.alt = `${conceptLabel}: ${concept.title}. ${concept.description}`;
    dialogTitle.textContent = concept.title;
    dialogDescription.textContent = concept.description;
    dialog.showModal();
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    opener?.focus();
    opener = null;
  });
}

/* ---------- Contact form -> WhatsApp draft (prepared, never sent) ---------- */
const form = document.getElementById('contact-form');
const draft = document.getElementById('draft');
const draftText = document.getElementById('draft-text');
const draftLink = document.getElementById('draft-link');

const messages = {
  name: 'Please enter your name (at least 2 characters).',
  phone: 'Please enter a phone number we can call back (8 to 20 digits).',
  location: 'Please tell us where the plot or home is.',
  message: 'Please describe what you are planning (at least 10 characters).',
};

function validateField(input) {
  const field = input.closest('.field');
  const error = field.querySelector('.field__error');
  const valid = input.checkValidity() && input.value.trim().length >= (input.minLength > 0 ? input.minLength : 1);
  field.dataset.invalid = String(!valid);
  input.setAttribute('aria-invalid', String(!valid));
  error.textContent = valid ? '' : messages[input.name];
  return valid;
}

export function buildDraft({ name, phone, location, message }) {
  return [
    `Hello ${company.name}, I would like to discuss a home build.`,
    '',
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Location: ${location}`,
    '',
    message,
  ].join('\n');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputs = [...form.querySelectorAll('input, textarea')];
  const results = inputs.map(validateField);
  const firstInvalid = inputs[results.indexOf(false)];
  if (firstInvalid) {
    draft.hidden = true;
    firstInvalid.focus();
    return;
  }
  const data = Object.fromEntries(inputs.map((i) => [i.name, i.value.trim()]));
  const text = buildDraft(data);
  draftText.textContent = text;
  draftLink.href = `https://wa.me/${company.phone.primary.digits}?text=${encodeURIComponent(text)}`;
  draft.hidden = false;
  draftLink.focus();
});

form.addEventListener('input', (e) => {
  const input = e.target;
  if (input.closest('.field')?.dataset.invalid === 'true') validateField(input);
  if (!draft.hidden) draft.hidden = true;
});
