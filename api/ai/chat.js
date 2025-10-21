// Vercel API Route for AI Chat
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    console.log('收到AI聊天请求')
    const { message, conversation_id, provider, apiConfig } = req.body
    
    console.log('请求数据详情:', { 
      message: message?.substring(0, 100) + '...', 
      provider: provider,
      hasApiConfig: !!apiConfig,
      conversationId: conversation_id,
      apiConfigKeys: apiConfig ? Object.keys(apiConfig) : 'N/A'
    })
    
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
    
    // 简化版AI服务处理
    const response = await processAIRequest(message, conversation_id, provider, apiConfig)
    
    return res.status(200).json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('AI Chat error详细信息:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      provider: error.provider || 'unknown'
    })
    
    return res.status(500).json({
      success: false,
      error: `AI服务错误: ${error.message}`
    })
  }
}

// 简化版AI请求处理（核心逻辑移植）
async function processAIRequest(message, conversationId, provider, apiConfig) {
  try {
    // 生成或使用现有的会话ID
    if (!conversationId) {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    // 简化处理，主要支持custom provider
    let response
    
    switch (provider) {
      case 'custom':
        response = await callCustomAPI(message, apiConfig)
        break
      case 'mock':
        response = await mockResponse(message)
        break
      default:
        throw new Error(`暂不支持的提供商: ${provider}，请使用custom配置`)
    }
    
    return {
      ...response,
      conversationId: conversationId,
      conversation_id: conversationId
    }
  } catch (error) {
    console.error(`AI请求处理错误:`, error.message)
    throw new Error(`${provider} provider调用失败: ${error.message}`)
  }
}

// Custom API调用
async function callCustomAPI(message, config) {
  try {
    const { apiUrl, apiKey, model, customHeaders } = config
    
    if (!apiUrl || !apiKey || !model) {
      throw new Error(`Custom API配置不完整: apiUrl=${!!apiUrl}, apiKey=${!!apiKey}, model=${!!model}`)
    }
    
    // 智能处理不同API的路径
    let fullUrl = apiUrl
    if (!apiUrl.includes('/chat/completions') && !apiUrl.includes('/v1/chat/completions')) {
      fullUrl = `${apiUrl}/v1/chat/completions`
    }
    
    const requestBody = {
      model,
      messages: [
        { role: 'system', content: '你是电路设计专家' },
        { role: 'user', content: message }
      ],
      max_tokens: 800,
      temperature: 0.7
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(customHeaders || {})
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Custom API调用失败: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Custom API返回数据格式异常')
    }
    
    const responseText = data.choices[0].message.content
    
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'custom'
    }
  } catch (error) {
    console.error('Custom API调用异常:', error)
    throw new Error(`Custom API调用失败: ${error.message}`)
  }
}

// Mock响应
async function mockResponse(message) {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    response: `Mock API 收到消息: "${message}"\n\n这是一个模拟的AI响应，用于测试系统功能。`,
    conversation_id: `mock_${Date.now()}`,
    provider: 'mock'
  }
}