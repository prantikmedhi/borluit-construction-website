import js from '@eslint/js';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'qa-artifacts/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        IntersectionObserver: 'readonly',
        matchMedia: 'readonly',
        requestAnimationFrame: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        HTMLDialogElement: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        fetch: 'readonly',
        Buffer: 'readonly',
        // used inside page.evaluate callbacks in scripts/qa.mjs
        document: 'readonly',
        window: 'readonly',
      },
    },
  },
];
