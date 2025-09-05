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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)

// React应用渲染完成后隐藏加载指示器
setTimeout(hideLoadingFallback, 500)

// 全局错误监听，避免静默白屏
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error || event.message)
  const loading = document.getElementById('loading-fallback')
  const errorInfo = document.getElementById('error-info')
  if (loading && errorInfo) {
    loading.style.display = 'block'
    errorInfo.textContent = '应用发生错误，请刷新重试'
    errorInfo.style.display = 'block'
  }
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  const loading = document.getElementById('loading-fallback')
  const errorInfo = document.getElementById('error-info')
  if (loading && errorInfo) {
    loading.style.display = 'block'
    errorInfo.textContent = '网络或服务异常，请稍后重试'
    errorInfo.style.display = 'block'
  }
})