import { BaseAPIAdapter, APIMessage, APIResponse, APIConfig } from '../BaseAPIAdapter.js'

export class DeepSeekAdapter extends BaseAPIAdapter {
  constructor(config: APIConfig) {
    super({
      ...config,
      model: config.model || 'deepseek-chat'
    })
  }

  async chat(messages: APIMessage[], options?: any): Promise<string> {
    const formattedMessages = this.formatMessages(messages)
    
    const data = {
      model: this.config.model,
      messages: formattedMessages,
      max_tokens: options?.maxTokens || this.config.maxTokens || 4000,
      temperature: options?.temperature || this.config.temperature || 0.7,
      stream: false
    }

    const response = await this.makeRequest('/chat/completions', data, options)
    const parsed = this.parseResponse(response.data)
    return parsed.content
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // 使用实际的chat接口测试，而不是models接口
      // 这样可以更准确地验证API密钥的权限
      const testMessages: APIMessage[] = [{ 
        role: 'user', 
        content: 'Hello, this is a test message.' 
      }]
      
      const response = await this.chat(testMessages, { maxTokens: 10 })
      
      // 如果能成功获得响应，说明API密钥有效
      return !!(response && response.length > 0)
    } catch (error: any) {
      // 记录详细的错误信息以便调试
      console.error('DeepSeek API key validation failed:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      })
      
      // 抛出错误而不是返回false，这样控制器可以获得详细的错误信息
      throw error
    }
  }

  formatMessages(messages: APIMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }

  parseResponse(response: any): APIResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from DeepSeek API')
    }

    const choice = response.choices[0]
    if (!choice.message || !choice.message.content) {
      throw new Error('Invalid response format from DeepSeek API')
    }

    return {
      content: choice.message.content,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined
    }
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CircuitsAI/1.0'
    }
  }
}