/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3002,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Ant Design 组件库
          antd: ['antd', '@ant-design/icons'],
          // 状态管理和工具
          utils: ['zustand', 'axios'],
        },
      },
    },
  },
  define: {
    __API_BASE_URL__: JSON.stringify(process.env.NODE_ENV === 'production' 
      ? 'https://circuitai-api.peyoba.workers.dev' 
      : 'http://localhost:3003'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true
  }
})