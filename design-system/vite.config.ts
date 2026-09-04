import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

// Library build for the GeQu design-system package: one ESM entry + a single
// CSS file + a rolled-up .d.ts, consumed by the design-sync skill's package
// converter (claude.ai/design). No app-specific bundling here — this is a
// small, standalone component library, built the same way any consumer of
// it would build a dependency.
export default defineConfig({
    plugins: [
        react(),
        dts({ insertTypesEntry: true, tsconfigPath: './tsconfig.json', entryRoot: 'src' }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: () => 'index.es.js',
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
        },
        cssCodeSplit: false,
        sourcemap: true,
    },
});
