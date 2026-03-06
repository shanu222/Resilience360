import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const configuredBase = process.env.VITE_BASE_PATH ?? '/'
const base = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-maskable.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'Resilience360',
        short_name: 'Resilience360',
        description: 'Infrastructure Safety & Disaster Engineering Toolkit',
        theme_color: '#1c6ea4',
        background_color: '#f4f7fb',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          {
            src: `${base}icons/icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: `${base}icons/icon-maskable.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2,mp4}'],
        maximumFileSizeToCacheInBytes: 60 * 1024 * 1024,
        navigateFallbackDenylist: [
          /^\/cost-estimator(?:\/|$)/,
          /^\/coe-portal(?:\/|$)/,
          /^\/material-hubs(?:\/|$)/,
          /^\/retrofit-calculator(?:\/|$)/,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 220,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
            },
          },
          {
            urlPattern: /\/videos\/.*\.mp4$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'iapd-videos',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              rangeRequests: true,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    proxy: {
      '/api/ndma/advisories': {
        target: 'https://ndma.gov.pk',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/advisories',
      },
      '/api/ndma/sitreps': {
        target: 'https://ndma.gov.pk',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/sitreps',
      },
      '/api/ndma/projections': {
        target: 'https://ndma.gov.pk',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/projection-impact-list_new',
      },
      '/api/pmd/rss': {
        target: 'https://cap-sources.s3.amazonaws.com',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/pk-pmd-en/rss.xml',
      },
      '/api/vision': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
      '/api/ml': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
      '/api/guidance': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
      '/api/models': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
