import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  // O .env fica na raiz do monorepo, não em apps/web. Sem isto o Vite procura
  // ao lado deste arquivo, não acha nada, e o app sobe sem as chaves do
  // Supabase — silenciosamente, como se a nuvem não estivesse configurada.
  envDir: path.resolve(__dirname, '../..'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SimetriApp — acompanhamento da cabecinha',
        short_name: 'SimetriApp',
        description:
          'Acompanhamento fotográfico semanal da simetria craniana do seu bebê. Ferramenta de acompanhamento visual, não substitui avaliação profissional.',
        theme_color: '#FDFCFA',
        background_color: '#FDFCFA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Fontes e o shell do app podem ser cacheados agressivamente.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Dados já sincronizados ficam legíveis offline (requisito do briefing).
            // NetworkFirst, não CacheFirst: dado de saúde desatualizado servido
            // por cima de dado fresco seria pior do que um erro de rede honesto.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@simetriapp/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5273,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
