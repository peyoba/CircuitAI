import axios from 'axios'
import logger from '../../config/logger.js'

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenAIAdapter {
  private apiKey: string
  private apiUrl: string
  private model: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1'
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured')
    }
  }

  async chat(messages: OpenAIMessage[], options?: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    try {
      const response = await axios.post<OpenAIResponse>(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 2000,
          stream: options?.stream || false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response from OpenAI')
      }

      const content = response.data.choices[0].message.content
      
      logger.info(`OpenAI API call successful. Tokens used: ${response.data.usage.total_tokens}`)
      
      return content

    } catch (error: any) {
      logger.error('OpenAI API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      })

      if (error.response?.status === 401) {
        throw new Error('OpenAI API authentication failed')
      } else if (error.response?.status === 429) {
        throw new Error('OpenAI API rate limit exceeded')
      } else if (error.response?.status === 402) {
        throw new Error('OpenAI API quota exceeded')
      } else {
        throw new Error(`OpenAI API error: ${error.message}`)
      }
    }
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      return false
    }

    try {
      await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000
      })
      return true
    } catch (error) {
      logger.error('OpenAI API key validation failed:', error)
      return false
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  getModel(): string {
    return this.model
  }

  setModel(model: string): void {
    this.model = model
  }
}