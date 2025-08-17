import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// AI服务适配器
import { AIService } from './services/AIService'

const app = new Hono()

// 中间件
app.use('*', logger())
app.use('*', cors({
  origin: [
    'https://circuitai.pages.dev', 
    'https://*.circuitai.pages.dev',
    'https://www.circuitai.top',
    'https://circuitai.top',
    'https://main.circuitai.pages.dev',
    'http://localhost:3002',
    'http://localhost:3000'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 健康检查
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    message: '服务运行正常',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'cloudflare-workers'
    }
  })
})

// AI聊天接口
app.post('/api/ai/chat', async (c) => {
  try {
    const { message, conversation_id, provider, apiConfig } = await c.req.json()
    
    // 初始化AI服务
    const aiService = new AIService()
    
    // 处理聊天请求
    const response = await aiService.chat(message, conversation_id, provider, apiConfig)
    
    return c.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('AI Chat error:', error)
    return c.json({
      success: false,
      error: 'AI服务暂时不可用，请稍后再试'
    }, 500)
  }
})

// API配置测试
app.post('/api/ai/test-config', async (c) => {
  try {
    const config = await c.req.json()
    
    // 测试API配置
    const aiService = new AIService()
    const result = await aiService.testConfig(config)
    
    return c.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('API Test error:', error)
    return c.json({
      success: false,
      error: `连接失败: ${error.message}`
    }, 400)
  }
})

// 404处理
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    path: c.req.path
  }, 404)
})

export default app
