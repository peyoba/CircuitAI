import { BaseAPIAdapter, APIMessage, APIResponse, APIConfig } from '../BaseAPIAdapter.js'

export interface CustomAPIConfig extends APIConfig {
  requestFormat: 'openai' | 'claude' | 'custom'
  responseFormat: 'openai' | 'claude' | 'custom'
  customHeaders?: Record<string, string>
  customRequestTransform?: (data: any) => any
  customResponseTransform?: (response: any) => APIResponse
  customEndpoint?: string
}

export class CustomAdapter extends BaseAPIAdapter {
  private customConfig: CustomAPIConfig

  constructor(config: CustomAPIConfig) {
    super(config)
    this.customConfig = config
  }

  async chat(messages: APIMessage[], options?: any): Promise<string> {
    const formattedMessages = this.formatMessages(messages)
    
    let data: any
    
    // 为SiliconFlow这样的慢速API预设更长的超时时间
    if (this.config.apiUrl.includes('siliconflow.cn')) {
      console.log('SiliconFlow API detected, using extended timeout for chat request')
      if (!options) options = {}
      if (!options.timeout) {
        options.timeout = 150000 // 150秒超时用于chat请求
      }
    }
    
    // 特殊处理Gemini API
    if (this.config.apiUrl.includes('generativelanguage.googleapis.com')) {
      // Gemini API格式
      data = {
        contents: [{
          parts: [{
            text: messages.map(m => `${m.role}: ${m.content}`).join('\n')
          }]
        }],
        generationConfig: {
          temperature: options?.temperature || this.config.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || this.config.maxTokens || 2000,
          topK: 1,
          topP: 1
        }
      }
    } else {
      // 其他API格式
      switch (this.customConfig.requestFormat) {
        case 'openai':
          data = {
            model: this.config.model,
            messages: formattedMessages,
            max_tokens: options?.maxTokens || this.config.maxTokens,
            temperature: options?.temperature || this.config.temperature
          }
          break
        case 'claude':
          data = {
            model: this.config.model,
            max_tokens: options?.maxTokens || this.config.maxTokens,
            temperature: options?.temperature || this.config.temperature,
            messages: formattedMessages
          }
          break
        case 'custom': {
          // 检查是否为SiliconFlow或其他需要messages格式的API
          const isSiliconFlow = this.config.apiUrl?.includes('siliconflow.cn')
          const isOpenAICompatible = this.config.apiUrl?.includes('openai.com') || isSiliconFlow
          
          if (isOpenAICompatible) {
            data = {
              model: this.config.model,
              messages: formattedMessages,
              max_tokens: options?.maxTokens || this.config.maxTokens,
              temperature: options?.temperature || this.config.temperature
            }
          } else {
            data = {
              prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
              model: this.config.model,
              max_tokens: options?.maxTokens || this.config.maxTokens,
              temperature: options?.temperature || this.config.temperature
            }
          }
          break
        }
      }
    }

    // 应用自定义请求转换
    if (this.customConfig.customRequestTransform) {
      data = this.customConfig.customRequestTransform(data)
    }

    const endpoint = this.getEndpoint()
    const response = await this.makeRequest(endpoint, data, options)
    const parsed = this.parseResponse(response.data)
    return parsed.content
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // 基本配置检查
      if (!this.config.apiKey || !this.config.apiUrl) {
        throw new Error('API密钥或URL未配置')
      }

      // 使用更简单的测试消息来验证API连接
      const testMessage = 'Hi'
      
      // 特殊处理不同的API提供商
      if (this.config.apiUrl.includes('generativelanguage.googleapis.com')) {
        // Gemini API验证
        const result = await this.chat([{ role: 'user', content: testMessage }])
        return !!(result && result.trim().length > 0)
      } else if (this.config.apiUrl.includes('api.anthropic.com')) {
        // Claude API验证
        const result = await this.chat([{ role: 'user', content: testMessage }])
        return !!(result && result.trim().length > 0)
      } else if (this.config.apiUrl.includes('siliconflow.cn')) {
        // SiliconFlow API验证 - 使用更长的超时时间
        console.log('SiliconFlow API detected, using extended timeout for validation')
        // 临时增加超时时间进行验证
        const originalTimeout = this.config.timeout
        this.config.timeout = 90000 // 90秒用于验证
        try {
          const result = await this.chat([{ role: 'user', content: testMessage }], { maxTokens: 10 })
          return !!(result && result.trim().length > 0)
        } finally {
          this.config.timeout = originalTimeout // 恢复原超时时间
        }
      } else {
        // 其他API（OpenAI兼容）验证
        const result = await this.chat([{ role: 'user', content: testMessage }])
        return !!(result && result.trim().length > 0)
      }
    } catch (error: any) {
      // 记录详细的验证错误
      console.error('API key validation failed:', {
        provider: this.constructor.name,
        apiUrl: this.config.apiUrl,
        error: error.message,
        code: error.code
      })
      
      // 重新抛出错误以便上层处理
      throw error
    }
  }

  formatMessages(messages: APIMessage[]): any[] {
    switch (this.customConfig.requestFormat) {
      case 'openai':
        return messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      case 'claude':
        return messages.filter(msg => msg.role !== 'system').map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      case 'custom':
      default:
        return messages
    }
  }

  parseResponse(response: any): APIResponse {
    // 应用自定义响应转换
    if (this.customConfig.customResponseTransform) {
      return this.customConfig.customResponseTransform(response)
    }

    // 特殊处理Gemini API响应
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        return {
          content: candidate.content.parts[0].text,
          usage: response.usageMetadata ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0
          } : undefined
        }
      }
    }

    switch (this.customConfig.responseFormat) {
      case 'openai':
        if (!response.choices || response.choices.length === 0) {
          throw new Error('No response from API')
        }
        return {
          content: response.choices[0].message.content,
          usage: response.usage ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          } : undefined
        }
      case 'claude':
        if (!response.content || response.content.length === 0) {
          throw new Error('No response from API')
        }
        return {
          content: response.content[0].text,
          usage: response.usage ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens
          } : undefined
        }
      case 'custom':
      default: {
        // 尝试从多种可能的字段中提取内容
        const content = response.text || response.content || response.message || response.response || JSON.stringify(response)
        return { content }
      }
    }
  }

  protected getHeaders(): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    console.log('CustomAdapter config:', {
      requestFormat: this.customConfig.requestFormat,
      apiUrl: this.config.apiUrl,
      apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 10)}...` : 'NOT_SET'
    })

    // 如果有自定义头部且包含认证信息，优先使用自定义头部
    if (this.customConfig.customHeaders?.['Authorization']) {
      console.log('Using custom headers with Authorization')
      return { ...baseHeaders, ...this.customConfig.customHeaders }
    }

    // 特殊处理Gemini API - API密钥在URL中，无需添加认证头
    if (this.config.apiUrl.includes('generativelanguage.googleapis.com')) {
      console.log('Gemini API detected, no auth header needed')
      return baseHeaders
    }

    // SiliconFlow和其他OpenAI兼容API都需要Bearer认证头
    console.log('Adding Bearer authorization header for', this.config.apiUrl)
    baseHeaders['Authorization'] = `Bearer ${this.config.apiKey}`
    
    console.log('Final headers:', Object.keys(baseHeaders))
    return baseHeaders
  }

  private getEndpoint(): string {
    // 如果有自定义端点，优先使用
    if (this.customConfig.customEndpoint) {
      return this.customConfig.customEndpoint
    }
    
    // 特殊处理Gemini API
    if (this.config.apiUrl.includes('generativelanguage.googleapis.com')) {
      // Gemini API需要在URL中包含模型名称和API密钥
      const modelName = this.config.model || 'gemini-2.0-flash'
      return `/v1beta/models/${modelName}:generateContent?key=${this.config.apiKey}`
    }
    
    switch (this.customConfig.requestFormat) {
      case 'openai':
        return '/v1/chat/completions'
      case 'claude':
        return '/v1/messages'
      case 'custom':
      default:
        return '/v1/chat/completions' // 默认使用OpenAI兼容端点
    }
  }
}