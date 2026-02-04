import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PFMSurveys',
      formats: ['iife'],
      fileName: () => 'embed.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: true,
  },
});
