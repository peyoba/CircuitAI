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
      environment: 'cloudflare-workers',
      version: '智能对话判断已部署 v1.1'  // 添加版本信息
    }
  })
})

// AI聊天接口
app.post('/api/ai/chat', async (c) => {
  try {
    console.log('收到AI聊天请求')
    const requestData = await c.req.json()
    console.log('请求数据详情:', { 
      message: requestData.message?.substring(0, 100) + '...', 
      provider: requestData.provider,
      hasApiConfig: !!requestData.apiConfig,
      conversationId: requestData.conversation_id,
      apiConfigKeys: requestData.apiConfig ? Object.keys(requestData.apiConfig) : 'N/A'
    })
    
    const { message, conversation_id, provider, apiConfig } = requestData
    
    if (!message || !provider) {
      throw new Error('缺少必要参数: message 或 provider')
    }
    
    // 对custom provider进行特殊验证
    if (provider === 'custom') {
      console.log('Custom provider配置验证:', {
        hasApiConfig: !!apiConfig,
        configKeys: apiConfig ? Object.keys(apiConfig) : 'N/A',
        hasApiUrl: !!(apiConfig?.apiUrl),
        hasApiKey: !!(apiConfig?.apiKey),
        hasModel: !!(apiConfig?.model)
      })
      
      if (!apiConfig || !apiConfig.apiUrl || !apiConfig.apiKey || !apiConfig.model) {
        throw new Error('Custom provider需要完整的API配置: apiUrl, apiKey, model')
      }
    }
    
    // 初始化AI服务
    console.log('初始化AI服务...')
    const aiService = new AIService()
    
    // 处理聊天请求
    console.log('开始处理聊天请求，provider:', provider)
    const response = await aiService.chat(message, conversation_id, provider, apiConfig)
    console.log('聊天处理完成，响应类型:', typeof response, '响应键:', Object.keys(response || {}))
    
    return c.json({
      success: true,
      data: response
    })
  } catch (error: any) {
    console.error('AI Chat error详细信息:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      provider: error.provider || 'unknown'
    })
    return c.json({
      success: false,
      error: `AI服务错误: ${error.message}`
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
