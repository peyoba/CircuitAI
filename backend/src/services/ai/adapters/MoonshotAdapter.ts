import { BaseAPIAdapter, APIMessage, APIResponse, APIConfig } from '../BaseAPIAdapter.js'

export class MoonshotAdapter extends BaseAPIAdapter {
  constructor(config: APIConfig) {
    super({
      ...config,
      model: config.model || 'moonshot-v1-8k'
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

    const response = await this.makeRequest('/v1/chat/completions', data, options)
    const parsed = this.parseResponse(response.data)
    return parsed.content
  }

  async validateApiKey(): Promise<boolean> {
    await this.makeRequest('/v1/models', {}, {})
    return true
  }

  formatMessages(messages: APIMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }

  parseResponse(response: any): APIResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from Moonshot API')
    }

    return {
      content: response.choices[0].message.content,
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
      'Content-Type': 'application/json'
    }
  }
}