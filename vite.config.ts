import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // vite-plugin-pwa ships vite-5 types; vitest@4 bundles vite-6 — cast resolves the mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico'],
    manifest: {
      name: 'مدير الأموال',
      short_name: 'الأموال',
      lang: 'ar',
      dir: 'rtl',
      start_url: '/',
      display: 'standalone',
      background_color: '#0a0a0a',
      theme_color: '#10b981',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
  })] as any[],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
