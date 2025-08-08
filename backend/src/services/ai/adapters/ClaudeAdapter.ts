import { BaseAPIAdapter, APIMessage, APIResponse, APIConfig } from '../BaseAPIAdapter.js'

export class ClaudeAdapter extends BaseAPIAdapter {
  constructor(config: APIConfig) {
    super({
      ...config,
      model: config.model || 'claude-3-sonnet-20240229'
    })
  }

  async chat(messages: APIMessage[], options?: any): Promise<string> {
    const formattedMessages = this.formatMessages(messages)
    
    const data = {
      model: this.config.model,
      max_tokens: options?.maxTokens || this.config.maxTokens,
      temperature: options?.temperature || this.config.temperature,
      messages: formattedMessages
    }

    const response = await this.makeRequest('/v1/messages', data, options)
    const parsed = this.parseResponse(response.data)
    return parsed.content
  }

  async validateApiKey(): Promise<boolean> {
    // Claude没有models endpoint，尝试一个简单的请求
    await this.chat([{ role: 'user', content: 'Hello' }])
    return true
  }

  formatMessages(messages: APIMessage[]): any[] {
    // Claude需要分离system message
    const systemMessages = messages.filter(msg => msg.role === 'system')
    const conversationMessages = messages.filter(msg => msg.role !== 'system')
    
    const formatted = conversationMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // 如果有system消息，添加到第一条用户消息前
    if (systemMessages.length > 0 && formatted.length > 0) {
      const systemContent = systemMessages.map(msg => msg.content).join('\n\n')
      if (formatted[0].role === 'user') {
        formatted[0].content = `${systemContent}\n\n${formatted[0].content}`
      }
    }

    return formatted
  }

  parseResponse(response: any): APIResponse {
    if (!response.content || response.content.length === 0) {
      throw new Error('No response from Claude API')
    }

    return {
      content: response.content[0].text,
      usage: response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      } : undefined
    }
  }

  protected getHeaders(): Record<string, string> {
    return {
      'x-api-key': this.config.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }
  }
}