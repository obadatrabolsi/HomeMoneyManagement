import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

// GitHub Pages serves a project site from a subpath (/<repo>/). The build base
// must match the repo name; dev keeps '/'. If your repo has a different name —
// or you use a user/org site or a custom domain — change REPO_BASE (use '/').
const REPO_BASE = '/HomeMoneyManagement/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // vite-plugin-pwa ships vite-5 types; vitest@4 bundles vite-6 — cast resolves the mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['vite.svg', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: 'مدير الأموال',
      short_name: 'الأموال',
      description: 'تطبيق لإدارة الأموال المنزلية — حسابات، عمليات، ميزانيات وأهداف.',
      lang: 'ar',
      dir: 'rtl',
      // Relative so the manifest works under any base (root or /<repo>/).
      start_url: '.',
      scope: '.',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#2563EB',
      theme_color: '#2563EB',
      categories: ['finance', 'productivity'],
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
  })] as any[],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Tests exercise the offline app; force Supabase "not configured" so a real
    // .env.local (with your project's credentials) never changes test behavior.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
}))
