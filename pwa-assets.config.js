import { defineConfig, presetIcon, presetMinimal } from '@vite-pwa/assets-generator';

export default defineConfig({
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' }],
  ],
  presets: [
    presetMinimal({
      declaration: true,
    }),
    presetIcon({
      sizes: [64, 192, 512],
      padding: '10%',
      background: '#ff8c00',
      themeColor: '#ff8c00',
    }),
  ],
  images: {
    svg: false,
    png: true,
    favicon: true,
    apple: true,
  },
  assets: {
    include: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
  },
});
