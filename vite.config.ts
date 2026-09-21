import { defineConfig } from 'vite';
import { resolve } from 'path';

// Relative base so the same build works on GitHub Pages (project subpath)
// and inside the Capacitor webview (file://).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        // the game
        main: resolve(__dirname, 'index.html'),
        // الرُّقية — a separate prototype of the spell system, served at /spell/.
        // Kept off the main entry on purpose: it must not disturb the deployed game.
        spell: resolve(__dirname, 'spell/index.html'),
      },
    },
  },
});
