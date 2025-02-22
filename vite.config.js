import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://www.okx.com',
        changeOrigin: true, // Меняет origin запроса на целевой
        rewrite: (path) => path.replace(/^\/api/, ''), // Убирает префикс `/api`
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Определяем глобальные объекты для браузера
      define: {
        global: 'globalThis', // Полифилл для global
      },
      // Включаем плагины для полифиллов
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true, // Полифилл для Buffer
          process: true, // Полифилл для process
        }),
        NodeModulesPolyfillPlugin(), // Полифилл для Node.js модулей
      ],
    },
  },
});