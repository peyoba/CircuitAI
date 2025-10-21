// Vercel API Route for API Config Testing
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
    const config = req.body
    
    // 测试API配置
    const result = await testApiConfig(config)
    
    return res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('API Test error:', error)
    return res.status(400).json({
      success: false,
      error: `连接失败: ${error.message}`
    })
  }
}

async function testApiConfig(config) {
  try {
    console.log('开始真实API配置测试:', { 
      provider: config.provider, 
      hasApiUrl: !!config.apiUrl,
      hasApiKey: !!config.apiKey,
      model: config.model 
    })
    
    // 真实的API测试：发送一个简单的问题并验证响应
    const testMessage = "请回答：这是一个API连接测试，请简单回复'测试成功'"
    const response = await callCustomAPI(testMessage, config)
    
    console.log('API测试响应:', { 
      hasResponse: !!response.response,
      responseLength: response.response?.length || 0,
      responsePreview: response.response?.substring(0, 100)
    })
    
    // 验证响应是否有效
    if (!response || !response.response || response.response.length < 5) {
      throw new Error('API返回的响应无效或太短')
    }
    
    return {
      isValid: true,
      provider: config.provider,
      model: config.model,
      testResponse: response.response.substring(0, 100) + (response.response.length > 100 ? '...' : ''),
      responseLength: response.response.length
    }
  } catch (error) {
    console.error('API配置测试失败:', {
      provider: config.provider,
      error: error.message
    })
    
    return {
      isValid: false,
      provider: config.provider,
      error: error.message,
      details: '真实API调用失败，请检查配置参数'
    }
  }
}

// 复用Custom API调用逻辑
async function callCustomAPI(message, config) {
  const { apiUrl, apiKey, model, customHeaders } = config
  
  if (!apiUrl || !apiKey || !model) {
    throw new Error(`Custom API配置不完整`)
  }
  
  let fullUrl = apiUrl
  if (!apiUrl.includes('/chat/completions')) {
    fullUrl = `${apiUrl}/v1/chat/completions`
  }
  
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(customHeaders || {})
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: 100,
      temperature: 0.7
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API调用失败: ${response.status} ${errorText}`)
  }
  
  const data = await response.json()
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('API返回数据格式异常')
  }
  
  return {
    response: data.choices[0].message.content
  }
}