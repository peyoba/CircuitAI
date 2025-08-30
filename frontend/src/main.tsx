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