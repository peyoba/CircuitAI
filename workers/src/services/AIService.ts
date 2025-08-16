// 简化版AI服务，适配Cloudflare Workers
export class AIService {
  async chat(message: string, conversationId: string, provider: string, apiConfig: any) {
    // 根据provider调用不同的AI服务
    switch (provider) {
      case 'openai':
        return await this.callOpenAI(message, apiConfig)
      case 'claude':
        return await this.callClaude(message, apiConfig)
      case 'gemini':
        return await this.callGemini(message, apiConfig)
      case 'custom':
        return await this.callCustomAPI(message, apiConfig)
      case 'mock':
        return await this.mockResponse(message)
      default:
        throw new Error(`不支持的提供商: ${provider}`)
    }
  }

  async testConfig(config: any) {
    try {
      // 简单的配置测试
      const response = await this.callCustomAPI('test', config)
      return {
        isValid: true,
        provider: config.provider,
        model: config.model
      }
    } catch (error) {
      return {
        isValid: false,
        provider: config.provider,
        error: error.message
      }
    }
  }

  private async callCustomAPI(message: string, config: any) {
    const { apiUrl, apiKey, model } = config
    
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: message }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      response: data.choices[0].message.content,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'custom'
    }
  }

  private async callOpenAI(message: string, config: any) {
    const { apiKey, model = 'gpt-3.5-turbo' } = config
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      response: data.choices[0].message.content,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'openai'
    }
  }

  private async callClaude(message: string, config: any) {
    const { apiKey, model = 'claude-3-sonnet-20240229' } = config
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: message }]
      })
    })

    if (!response.ok) {
      throw new Error(`Claude API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      response: data.content[0].text,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'claude'
    }
  }

  private async callGemini(message: string, config: any) {
    const { apiKey, model = 'gemini-pro' } = config
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: message }]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      response: data.candidates[0].content.parts[0].text,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'gemini'
    }
  }

  private async mockResponse(message: string) {
    // 简单的mock响应
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      response: `Mock API 收到消息: "${message}"\n\n这是一个模拟的AI响应，用于测试系统功能。`,
      conversation_id: `mock_${Date.now()}`,
      provider: 'mock'
    }
  }
}
