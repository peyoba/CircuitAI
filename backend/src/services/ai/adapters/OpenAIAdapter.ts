import { BaseAPIAdapter, APIMessage, APIResponse, APIConfig } from '../BaseAPIAdapter.js'

export class OpenAIAdapter extends BaseAPIAdapter {
  constructor(config: APIConfig) {
    super({
      ...config,
      model: config.model || 'gpt-3.5-turbo'
    })
  }

  async chat(messages: APIMessage[], options?: any): Promise<string> {
    const formattedMessages = this.formatMessages(messages)
    
    const data = {
      model: this.config.model,
      messages: formattedMessages,
      max_tokens: options?.maxTokens || this.config.maxTokens,
      temperature: options?.temperature || this.config.temperature,
      stream: false
    }

    const response = await this.makeRequest('/chat/completions', data, options)
    const parsed = this.parseResponse(response.data)
    return parsed.content
  }

  async validateApiKey(): Promise<boolean> {
    await this.makeRequest('/models', {}, {})
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
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    }
  }
}