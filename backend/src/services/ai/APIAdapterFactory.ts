import { BaseAPIAdapter } from './BaseAPIAdapter.js'
import { OpenAIAdapter } from './adapters/OpenAIAdapter.js'
import { ClaudeAdapter } from './adapters/ClaudeAdapter.js'
import { CustomAdapter, CustomAPIConfig } from './adapters/CustomAdapter.js'
import { MockAdapter } from './adapters/MockAdapter.js'
import { DeepSeekAdapter } from './adapters/DeepSeekAdapter.js'
import { MoonshotAdapter } from './adapters/MoonshotAdapter.js'

export type SupportedProvider = 'openai' | 'claude' | 'gemini' | 'custom' | 'mock' | 'deepseek' | 'moonshot'

export interface ProviderConfig {
  provider: SupportedProvider
  apiKey: string
  apiUrl: string
  model: string
  maxTokens?: number
  temperature?: number
  // 自定义提供商的额外配置
  requestFormat?: 'openai' | 'claude' | 'custom'
  responseFormat?: 'openai' | 'claude' | 'custom'
  customHeaders?: Record<string, string>
}

export class APIAdapterFactory {
  private static adapters: Map<string, BaseAPIAdapter> = new Map()

  static createAdapter(config: ProviderConfig): BaseAPIAdapter {
    const key = `${config.provider}_${config.apiUrl}_${config.model}`
    
    // 如果已存在相同配置的适配器，复用它
    if (this.adapters.has(key)) {
      const adapter = this.adapters.get(key)!
      adapter.updateConfig(config)
      return adapter
    }

    let adapter: BaseAPIAdapter

    switch (config.provider) {
      case 'openai':
        adapter = new OpenAIAdapter({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl || 'https://api.openai.com/v1',
          model: config.model || 'gpt-3.5-turbo',
          maxTokens: config.maxTokens,
          temperature: config.temperature
        })
        break

      case 'claude':
        adapter = new ClaudeAdapter({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl || 'https://api.anthropic.com',
          model: config.model || 'claude-3-sonnet-20240229',
          maxTokens: config.maxTokens,
          temperature: config.temperature
        })
        break

      case 'gemini':
        // Gemini使用自定义适配器，采用特定的格式
        adapter = new CustomAdapter({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl || 'https://generativelanguage.googleapis.com/v1beta',
          model: config.model || 'gemini-pro',
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          requestFormat: 'custom',
          responseFormat: 'custom',
          customEndpoint: `/models/${config.model || 'gemini-pro'}:generateContent?key=${config.apiKey}`,
          customHeaders: {
            'Content-Type': 'application/json'
          },
          customRequestTransform: (data) => ({
            contents: [{
              parts: [{ text: data.prompt }]
            }],
            generationConfig: {
              temperature: data.temperature || 0.7,
              maxOutputTokens: Math.min(data.max_tokens || 1500, 1500), // 限制最大输出token
              topK: 1,
              topP: 0.8
            }
          }),
          customResponseTransform: (response) => ({
            content: response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini API'
          })
        } as CustomAPIConfig)
        break

      case 'custom':
        adapter = new CustomAdapter({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          requestFormat: config.requestFormat || 'openai',
          responseFormat: config.responseFormat || 'openai',
          customHeaders: config.customHeaders
        } as CustomAPIConfig)
        break

      case 'mock':
        adapter = new MockAdapter({
          apiKey: config.apiKey || 'mock-key',
          apiUrl: config.apiUrl || 'mock://localhost',
          model: config.model || 'mock-model',
          maxTokens: config.maxTokens,
          temperature: config.temperature
        })
        break

      case 'deepseek':
        adapter = new DeepSeekAdapter({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl || 'https://api.siliconflow.cn/v1',
          model: config.model || 'deepseek-chat',
          maxTokens: config.maxTokens,
          temperature: config.temperature
        })
        break

      case 'moonshot':
        adapter = new MoonshotAdapter({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl || 'https://api.moonshot.cn',
          model: config.model || 'moonshot-v1-8k',
          maxTokens: config.maxTokens,
          temperature: config.temperature
        })
        break

      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }

    this.adapters.set(key, adapter)
    return adapter
  }

  static getAdapter(key: string): BaseAPIAdapter | undefined {
    return this.adapters.get(key)
  }

  static clearCache(): void {
    this.adapters.clear()
  }

  static getSupportedProviders(): Array<{
    id: SupportedProvider
    name: string
    defaultUrl: string
    description: string
  }> {
    return [
      {
        id: 'openai',
        name: 'OpenAI GPT',
        defaultUrl: 'https://api.openai.com/v1',
        description: '支持GPT-3.5/4等模型'
      },
      {
        id: 'claude',
        name: 'Anthropic Claude',
        defaultUrl: 'https://api.anthropic.com',
        description: '支持Claude-3等模型'
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        defaultUrl: 'https://generativelanguage.googleapis.com/v1beta',
        description: '支持Gemini Pro等模型'
      },
      {
        id: 'custom',
        name: '自定义API',
        defaultUrl: '',
        description: '支持第三方或自建API服务'
      },
      {
        id: 'mock',
        name: '模拟API (测试)',
        defaultUrl: 'mock://localhost',
        description: '用于测试和演示的模拟API服务'
      },
      {
        id: 'deepseek',
        name: 'DeepSeek (硅基流动)',
        defaultUrl: 'https://api.siliconflow.cn/v1',
        description: '硅基流动提供的DeepSeek模型，高性价比'
      },
      {
        id: 'moonshot',
        name: 'Moonshot AI (国内)',
        defaultUrl: 'https://api.moonshot.cn',
        description: '月之暗面AI，国内可访问'
      }
    ]
  }
}