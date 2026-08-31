import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


export default defineConfig({
  server: {
    host: '127.0.0.1',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.png'],
      workbox: {
        // woff2 is not in workbox's default glob. Without it the shell opens
        // offline but repaints in a fallback face, which shifts every metric
        // column. Only the two subsets the UI needs are emitted (see
        // src/styles/fonts.css), so this precaches ~65 KB, not the full family.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The shell must open offline. Data already does: it lives in
        // localStorage and IndexedDB, both of which work with no network.
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // The sync endpoint. NetworkOnly on purpose — a cached snapshot
            // served to the merge would look like the server's current state
            // and could push a stale version back over newer data. Sync failing
            // cleanly while offline is correct; sync succeeding with stale data
            // is the bug this phase exists to fix.
            urlPattern: /\/api\/state/,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'GeQu - ADHD Control',
        short_name: 'GeQu',
        description: 'Когнитивный трекер для СДВГ',
        theme_color: '#0A0B0D',
        background_color: '#0A0B0D',
        display: 'standalone',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})

