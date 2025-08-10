import { ChatMessage } from '../../../../shared/dist/index.js'
import logger from '../../config/logger.js'
import { APIAdapterFactory, ProviderConfig } from './APIAdapterFactory.js'
import { BaseAPIAdapter, APIMessage } from './BaseAPIAdapter.js'
import { ConversationManager, ConversationContext } from './ConversationManager.js'
import { PromptTemplates } from './PromptTemplates.js'
import { CircuitGenerator } from '../circuit/CircuitGenerator.js'
import { BOMGenerator } from '../circuit/BOMGenerator.js'

export interface ChatRequest {
  message: string
  conversationId?: string
  provider: string
  apiConfig?: ProviderConfig
}

export interface CircuitData {
  ascii?: string
  description?: string
  components?: Array<{
    id: string
    name: string
    type: string
    reference: string
    value?: string
  }>
  properties?: Array<{
    name: string
    value: string | number
    unit?: string
    description?: string
  }>
  connections?: Array<{
    id: string
    from: { component: string; pin?: string }
    to: { component: string; pin?: string }
    label?: string
    description?: string
  }>
}

export interface BOMData {
  items?: Array<{
    component: string
    quantity: number
    value?: string
    package?: string
    price?: number
    manufacturer?: string
    supplier?: string
  }>
  totalCost?: number
}

export interface ChatResponse {
  content: string
  conversationId: string
  provider: string
  circuitData?: CircuitData
  bomData?: BOMData
}

export class AIService {
  private conversationManager: ConversationManager
  private circuitGenerator: CircuitGenerator
  private bomGenerator: BOMGenerator
  // private apiConfigs: Map<string, ProviderConfig> = new Map()

  constructor() {
    this.conversationManager = new ConversationManager()
    this.circuitGenerator = new CircuitGenerator()
    this.bomGenerator = new BOMGenerator()
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      // 创建或获取会话（复用现有会话ID）
      let conversationId = request.conversationId
      if (!conversationId || !this.conversationManager.getConversation(conversationId)) {
        conversationId = this.conversationManager.createConversation()
      }
      
      // 添加用户消息
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: request.message,
        timestamp: new Date()
      }
      this.conversationManager.addMessage(conversationId, userMessage)

      // 获取会话上下文
      const context = this.conversationManager.getContext(conversationId)
      const messages = this.conversationManager.getMessages(conversationId, 10) // 最近10条消息

      // 获取API适配器 - 只使用真实API，不使用模拟响应
      let aiResponse: string
      
      console.log('API Config received:', JSON.stringify(request.apiConfig, null, 2))
      console.log('Config validation result:', this.isValidConfig(request.apiConfig || {} as ProviderConfig))
      
      if (request.apiConfig && this.isValidConfig(request.apiConfig)) {
        // 使用用户提供的API配置
        console.log('Using user provided API config for provider:', request.apiConfig.provider)
        const adapter = APIAdapterFactory.createAdapter(request.apiConfig)
        aiResponse = await this.callAPI(adapter, messages, context)
        console.log('Real API call successful')
      } else {
        console.log('User config not valid, trying environment config for provider:', request.provider)
        // 尝试使用环境变量中的配置
        const envAdapter = this.getEnvironmentAdapter(request.provider)
        if (envAdapter) {
          console.log('Using environment API config')
          aiResponse = await this.callAPI(envAdapter, messages, context)
          console.log('Environment API call successful')
        } else {
          // 没有有效配置，直接报错
          throw new Error(`没有找到有效的API配置。请确保已正确配置API密钥和URL。Provider: ${request.provider}`)
        }
      }

      // 添加AI回复消息
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }
      this.conversationManager.addMessage(conversationId, assistantMessage)

      // 检查是否包含电路设计内容
      const circuitData = await this.extractCircuitData(aiResponse)
      const bomData = await this.extractBOMData(aiResponse)

      logger.info(`AI response generated for provider: ${request.provider}, conversation: ${conversationId}`)

      return {
        content: aiResponse,
        conversationId,
        provider: request.provider,
        circuitData: circuitData || undefined,
        bomData: bomData || undefined
      }
    } catch (error) {
      logger.error('AI Service error:', error)
      throw new Error('AI服务调用失败')
    }
  }

  private async callAPI(adapter: BaseAPIAdapter, messages: ChatMessage[], context?: ConversationContext): Promise<string> {
    const template = PromptTemplates.getCircuitDesignTemplate()
    
    // 构建API消息格式
    const apiMessages: APIMessage[] = [
      { role: 'system', content: template.system }
    ]

    // 检查是否是电源设计相关的查询
    const latestMessage = messages[messages.length - 1]?.content || ''
    const lowerMessage = latestMessage.toLowerCase()
    
    if ((lowerMessage.includes('电源') || lowerMessage.includes('稳压') || 
         lowerMessage.includes('5v') || lowerMessage.includes('3.3v') || 
         lowerMessage.includes('转换') || lowerMessage.includes('ldo')) && 
        (lowerMessage.includes('设计') || lowerMessage.includes('电路'))) {
      // 添加电源设计专用提示词
      apiMessages.push({
        role: 'system',
        content: PromptTemplates.getPowerSupplyDesignPrompt()
      })
    }

    // 根据上下文添加阶段特定的提示
    if (context?.phase) {
      apiMessages.push({
        role: 'system',
        content: template.phases[context.phase]
      })
    }

    // 添加历史消息
    messages.forEach(msg => {
      apiMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })
    })

    return await adapter.chat(apiMessages, {
      temperature: 0.7,
      maxTokens: 2000
    })
  }

  private getEnvironmentAdapter(provider: string): BaseAPIAdapter | null {
    const envConfig = this.getEnvironmentConfig(provider)
    if (!envConfig) return null

    try {
      return APIAdapterFactory.createAdapter(envConfig)
    } catch (error) {
      logger.error(`Failed to create environment adapter for ${provider}:`, error)
      return null
    }
  }

  private getEnvironmentConfig(provider: string): ProviderConfig | null {
    switch (provider) {
      case 'openai':
        if (process.env.OPENAI_API_KEY) {
          return {
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY,
            apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
          }
        }
        break
      case 'claude':
        if (process.env.ANTHROPIC_API_KEY) {
          return {
            provider: 'claude',
            apiKey: process.env.ANTHROPIC_API_KEY,
            apiUrl: process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com',
            model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
          }
        }
        break
      case 'gemini':
        if (process.env.GOOGLE_API_KEY) {
          return {
            provider: 'gemini',
            apiKey: process.env.GOOGLE_API_KEY,
            apiUrl: process.env.GOOGLE_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
            model: process.env.GOOGLE_MODEL || 'gemini-pro'
          }
        }
        break
      case 'mock':
        // Mock模式总是可用，不需要API密钥
        return {
          provider: 'mock',
          apiKey: 'mock-key',
          apiUrl: 'http://localhost:3001/api/mock',
          model: 'mock-model'
        }
    }
    return null
  }

  private isValidConfig(config: ProviderConfig): boolean {
    return !!(config.apiKey && config.apiUrl && config.provider)
  }

  // 删除所有模拟响应方法 - 强制使用真实API

  private async extractCircuitData(content: string): Promise<CircuitData | null> {
    // 检查是否包含ASCII电路图
    const codeBlockRegex = /```[\s\S]*?```/g
    const codeBlocks = content.match(codeBlockRegex)
    
    if (codeBlocks) {
      for (const block of codeBlocks) {
        const cleanBlock = block.replace(/```/g, '').trim()
        if (this.isCircuitDiagram(cleanBlock)) {
          return {
            ascii: cleanBlock,
            description: '电路原理图',
            components: this.circuitGenerator.extractComponents(cleanBlock),
            properties: this.circuitGenerator.extractProperties(content),
            connections: this.circuitGenerator.extractConnections(cleanBlock)
          }
        }
      }
    }
    
    return null
  }

  private async extractBOMData(content: string): Promise<BOMData | null> {
    // 检查是否包含BOM信息
    if (content.includes('元件清单') || content.includes('BOM') || content.includes('物料清单')) {
      const bomItems = this.bomGenerator.generateFromContent(content)
      const totalCost = bomItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
      
      return {
        items: bomItems.map(item => ({
          component: item.component,
          quantity: item.quantity,
          value: item.value,
          package: item.package,
          price: item.price,
          manufacturer: item.manufacturer,
          supplier: item.supplier
        })),
        totalCost
      }
    }
    
    return null
  }

  private isCircuitDiagram(text: string): boolean {
    const circuitPatterns = [
      /[+-]{2,}/, // 电源线
      /\[.*?\]/, // 元件符号
      /VCC|GND|VDD|VSS/, // 电源标识
      /----/, // 连接线
      /R\d+|C\d+|L\d+|U\d+|D\d+/ // 元件标号
    ]
    
    return circuitPatterns.some(pattern => pattern.test(text))
  }

  async validateApiKey(provider: string, apiKey: string, apiUrl?: string): Promise<boolean> {
    try {
      const config: ProviderConfig = {
        provider: provider as 'openai' | 'claude' | 'gemini' | 'custom' | 'mock',
        apiKey,
        apiUrl: apiUrl || '',
        model: 'test'
      }
      const adapter = APIAdapterFactory.createAdapter(config)
      return await adapter.validateApiKey()
    } catch (error) {
      logger.error(`API key validation failed for ${provider}:`, error)
      return false
    }
  }

  getStats() {
    return this.conversationManager.getStats()
  }
}