/**
 * Vite 配置文件 — 幸存者项目
 * 用于构建生产版本并部署到 GitHub Pages
 */

import { defineConfig } from 'vite';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  root: 'src',
  base: isProduction ? '/survivors/' : '/',
  build: {
    outDir: '../.survivors-dist',
    assetsDir: 'assets',
    sourcemap: !isProduction,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'src/index.html',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
