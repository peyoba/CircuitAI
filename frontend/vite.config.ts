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
    chunkSizeWarningLimit: 800,
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React 核心库
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor'
          }
          // React Router
          if (id.includes('react-router')) {
            return 'router'
          }
          // Ant Design 核心组件
          if (id.includes('antd/es/_util') || id.includes('antd/es/config-provider')) {
            return 'antd-core'
          }
          // Ant Design 表单组件
          if (id.includes('antd/es/form') || id.includes('antd/es/input') || 
              id.includes('antd/es/select') || id.includes('antd/es/button')) {
            return 'antd-forms'
          }
          // Ant Design 布局组件
          if (id.includes('antd/es/layout') || id.includes('antd/es/grid') ||
              id.includes('antd/es/space') || id.includes('antd/es/divider')) {
            return 'antd-layout'
          }
          // Ant Design 反馈组件
          if (id.includes('antd/es/message') || id.includes('antd/es/notification') ||
              id.includes('antd/es/modal') || id.includes('antd/es/spin')) {
            return 'antd-feedback'
          }
          // Ant Design 数据展示组件
          if (id.includes('antd/es/table') || id.includes('antd/es/list') ||
              id.includes('antd/es/card') || id.includes('antd/es/avatar')) {
            return 'antd-display'
          }
          // Ant Design 图标
          if (id.includes('@ant-design/icons')) {
            return 'antd-icons'
          }
          // 其他 Ant Design 组件
          if (id.includes('antd/es/')) {
            return 'antd-others'
          }
          // 工具库
          if (id.includes('axios') || id.includes('zustand')) {
            return 'utils'
          }
          // node_modules 中的其他依赖
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      },
      external: [],
      treeshake: {
        preset: 'recommended'
      }
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