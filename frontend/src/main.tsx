import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.tsx'
import './index.css'

// 隐藏加载指示器
const hideLoadingFallback = () => {
  const loading = document.getElementById('loading-fallback')
  if (loading) {
    loading.style.display = 'none'
  }
}

// 显示错误信息
const showError = (message: string) => {
  const loading = document.getElementById('loading-fallback')
  const errorInfo = document.getElementById('error-info')
  if (loading && errorInfo) {
    loading.style.display = 'block'
    errorInfo.textContent = message
    errorInfo.style.display = 'block'
  }
}

// 全局错误监听，避免静默白屏
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error || event.message)
  showError('应用发生错误，请刷新重试')
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  showError('网络或服务异常，请稍后重试')
})

// 安全地渲染React应用
try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <ConfigProvider locale={zhCN}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </React.StrictMode>
  )

  // React应用渲染完成后隐藏加载指示器
  setTimeout(hideLoadingFallback, 500)
  
  console.log('✅ React应用启动成功')
} catch (error) {
  console.error('❌ React应用启动失败:', error)
  const errorMessage = error instanceof Error ? error.message : String(error)
  showError(`应用启动失败: ${errorMessage}`)
}