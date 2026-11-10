import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', 'src/data/ibge.gerado.ts', 'public/sw.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/engine/**', 'src/data/**'],
    rules: {
      // O motor é puro: não pode depender da interface nem do navegador.
      'no-restricted-imports': ['error', { patterns: ['**/ui/*', '**/storage/*', 'react', 'react-dom'] }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage'],
    },
  },
  { files: ['scripts/**'], languageOptions: { globals: { console: 'readonly', fetch: 'readonly', URL: 'readonly' } } },
);
