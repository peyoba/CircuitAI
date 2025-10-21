import React from 'react'
import ReactDOM from 'react-dom/client'

// 最小化的应用组件
const MinimalApp = () => {
  const [status, setStatus] = React.useState('正在初始化...')
  
  React.useEffect(() => {
    const loadFullApp = async () => {
      try {
        setStatus('加载配置...')
        
        // 动态导入完整应用
        const { default: FullApp } = await import('./App-safe')
        
        setStatus('✅ 应用加载成功')
        
        // 渲染完整应用
        const root = document.getElementById('root')
        if (root) {
          root.innerHTML = '' // 清空当前内容
          const fullRoot = ReactDOM.createRoot(root)
          fullRoot.render(<FullApp />)
        }
        
      } catch (error) {
        console.error('应用加载失败:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        setStatus(`❌ 加载失败: ${errorMessage}`)
      }
    }
    
    // 延迟加载，确保DOM就绪
    const timer = setTimeout(loadFullApp, 100)
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid rgba(255,255,255,0.3)',
        borderTop: '4px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>
      
      <h1 style={{ marginBottom: '10px' }}>🔌 CircuitAI</h1>
      <p style={{ opacity: 0.9, marginBottom: '30px' }}>{status}</p>
      
      <div>
        <a 
          href="/migration-test.html"
          style={{
            color: 'white',
            textDecoration: 'none',
            padding: '10px 20px',
            border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: '5px',
            margin: '5px'
          }}
        >
          🔧 功能测试页
        </a>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// 安全启动
try {
  // 隐藏原有的loading
  const loading = document.getElementById('loading-fallback')
  if (loading) {
    loading.style.display = 'none'
  }
  
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  const root = ReactDOM.createRoot(rootElement)
  root.render(<MinimalApp />)
  
  console.log('✅ 最小化React应用启动成功')
} catch (error) {
  console.error('❌ React应用启动失败:', error)
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // 显示纯HTML错误页面
  document.body.innerHTML = `
    <div style="padding: 50px; text-align: center; font-family: Arial, sans-serif;">
      <h1 style="color: #cf1322;">⚠️ 应用启动失败</h1>
      <p>错误信息: ${errorMessage}</p>
      <a href="/migration-test.html" style="color: #1890ff;">点击使用功能测试页</a>
    </div>
  `
}