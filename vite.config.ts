import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// base relativa: o dist/ funciona em qualquer pasta de qualquer hospedagem estática.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'] },
});
