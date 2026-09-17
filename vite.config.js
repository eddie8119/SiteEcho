/// <reference types="vitest" />
import fs from 'fs';
import path from 'path';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VueI18nPlugin({
      // 指定翻譯檔案的路徑
      include: path.resolve(__dirname, './src/locales/**'),
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      // 僅在移動端啟用 PWA
      strategies: process.env.NODE_ENV === 'development' ? 'injectManifest' : 'generateSW',
      manifest: {
        name: 'SiteNear｜工地履歷相簿工具',
        short_name: 'SiteNear',
        description: '專為室內與建築與施工團隊打造的工程管理軟體，整合工地紀錄、任務追蹤與專案排程',
        theme_color: '#ff8c00',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/mobile/timeline',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        permissions: ['camera', 'camera capture'],
        // 僅針對移動端優化
        prefer_related_applications: false,
        categories: ['productivity', 'business', 'utilities'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        // 僅快取移動端相關資源
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /\/mobile\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mobile-pages-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
              },
            },
          },
        ],
      },
      // 動態注入 PWA 腳本
      injectRegister: null,
    }),
  ],
  server: {
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // 配置 @ 为 src 目录
    },
  },
  build: {
    // 確保資源不會被內聯為 base64
    assetsInlineLimit: 0,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
  },
});
