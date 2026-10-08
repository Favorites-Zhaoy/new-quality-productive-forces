import { defineConfig } from 'vite';

// base 设为相对路径，方便部署到 GitHub Pages 子目录
export default defineConfig({
  base: './',
  server: { open: true },
});
