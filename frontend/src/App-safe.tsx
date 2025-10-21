import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

// 简化版组件，避免复杂的懒加载
const HomePage = React.lazy(() => 
  import('./pages/Home/HomePage').catch(() => 
    Promise.resolve({ 
      default: () => (
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <h1>🔌 CircuitAI</h1>
          <p>正在加载主页组件...</p>
          <a href="/migration-test.html" style={{ color: '#1890ff' }}>
            如果长时间未加载，请点击这里使用功能测试页
          </a>
        </div>
      )
    })
  )
)

const DesignPage = React.lazy(() => 
  import('./pages/Design/DesignPage').catch(() => 
    Promise.resolve({ 
      default: () => (
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <h2>⚠️ 设计页面加载失败</h2>
          <p>请刷新页面重试，或联系技术支持</p>
        </div>
      )
    })
  )
)

// 简单的Loading组件
const Loading = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    flexDirection: 'column'
  }}>
    <div style={{
      width: '40px',
      height: '40px', 
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #1890ff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p style={{ marginTop: '20px', color: '#666' }}>加载中...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
)

// 错误边界组件
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React错误边界捕获到错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '50px', 
          textAlign: 'center',
          background: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h2 style={{ color: '#cf1322' }}>⚠️ 应用遇到错误</h2>
          <p style={{ color: '#666', margin: '20px 0' }}>
            错误信息: {this.state.error?.message || '未知错误'}
          </p>
          <div>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                padding: '8px 16px', 
                background: '#1890ff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                margin: '5px',
                cursor: 'pointer'
              }}
            >
              🔄 刷新页面
            </button>
            <a 
              href="/migration-test.html" 
              style={{ 
                padding: '8px 16px', 
                background: '#52c41a', 
                color: 'white', 
                textDecoration: 'none',
                borderRadius: '4px',
                margin: '5px',
                display: 'inline-block'
              }}
            >
              🔧 功能测试页
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <BrowserRouter>
          <React.Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/design" element={<DesignPage />} />
              <Route path="*" element={
                <div style={{ padding: '50px', textAlign: 'center' }}>
                  <h2>🔍 页面未找到</h2>
                  <p>请检查URL是否正确</p>
                  <a href="/" style={{ color: '#1890ff' }}>返回首页</a>
                </div>
              } />
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App