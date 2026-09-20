import { defineConfig } from 'vite';

// Relative base so the same build works on GitHub Pages (project subpath)
// and inside the Capacitor webview (file://).
export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
