import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        globals: true,
        // `scripts/` holds browser-driven gates (smoke, theme, a11y) that are run
        // by their own npm scripts against a real Chromium. They are not vitest
        // suites and would fail if collected as such.
        include: ['src/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/lib/**', 'src/features/**/logic.ts', 'src/features/insights/**', 'src/stores/**'],
            // Thresholds are deliberately per-directory rather than global: a
            // global number lets well-tested pure logic mask an untested store.
            thresholds: {
                'src/lib/datetime.ts': { statements: 95, branches: 85, functions: 100, lines: 95 },
            },
        },
    },
});
