// 简化版AI服务，适配Cloudflare Workers
export class AIService {
  async chat(message: string, conversationId: string, provider: string, apiConfig: any) {
    // 根据provider调用不同的AI服务
    switch (provider) {
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
