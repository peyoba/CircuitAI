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

      // 只在电路设计相关的对话中提取电路数据
      const isCircuitQuery = this.isCircuitDesignQuery(request.message)
      let circuitData: CircuitData | null = null
      let bomData: BOMData | null = null
      
      if (isCircuitQuery) {
        circuitData = await this.extractCircuitData(aiResponse)
        bomData = await this.extractBOMData(aiResponse)
      }

      logger.info(`AI response generated for provider: ${request.provider}, conversation: ${conversationId}, circuit design: ${isCircuitQuery}`)

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
    
    // 检查当前消息是否需要电路设计
    const latestMessage = messages[messages.length - 1]?.content || ''
    const needsCircuitDesign = this.isCircuitDesignQuery(latestMessage)
    
    // 调试日志
    console.log('=== AI Service Debug ===')
    console.log('User message:', latestMessage)
    console.log('Needs circuit design:', needsCircuitDesign)
    console.log('========================')
    
    // 构建API消息格式
    const apiMessages: APIMessage[] = []
    
    if (needsCircuitDesign) {
      // 电路设计相关的查询，使用专业提示词
      apiMessages.push({ role: 'system', content: template.system })
      
      // 检查是否是电源设计相关的查询
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
    } else {
      // 一般对话，使用简单的助手提示词，也包含思考过程
      apiMessages.push({ 
        role: 'system', 
        content: `你是CircuitsAI的智能助手。请自然地回答用户的问题。

## 回复格式要求：
对于复杂问题，请按以下格式输出让用户看到你的思考过程：

<thinking>
1. 理解问题：理解用户真正想问什么
2. 分析思路：思考回答的角度和重点
3. 组织回答：如何清晰地表达答案
</thinking>

然后给出友好的回答。对于简单问候和日常对话，可以直接回答无需显示思考过程。` 
      })
    }

    // 添加历史消息
    messages.forEach(msg => {
      apiMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })
    })

    // 智能重试机制 - 如果遇到token限制错误，使用更少的token重试
    const maxRetries = 2
    let attempt = 0
    
    while (attempt <= maxRetries) {
      try {
        let maxTokens = needsCircuitDesign ? 2000 : 500
        let temperature = needsCircuitDesign ? 0.7 : 0.9
        
        // 根据重试次数调整参数
        if (attempt > 0) {
          maxTokens = Math.max(500, maxTokens - (attempt * 500)) // 每次重试减少500 token
          // 对于Gemini API，进一步限制
          if (adapter.constructor.name === 'CustomAdapter' && 
              (adapter as any).config?.apiUrl?.includes('generativelanguage.googleapis.com')) {
            maxTokens = Math.min(maxTokens, 1000) // Gemini最多1000 tokens
          }
          
          // 在重试时使用更简洁的提示词
          if (needsCircuitDesign && attempt >= 1) {
            apiMessages[0] = {
              role: 'system',
              content: `你是电路设计专家。请简洁回答用户的电路设计问题，直接提供核心方案，避免过长的解释。重点包括：基本电路、关键元件参数、连接方式。`
            }
            // 移除额外的提示词以节省token
            if (apiMessages.length > 2) {
              apiMessages.splice(1, apiMessages.length - 2)
            }
          }
        }

        return await adapter.chat(apiMessages, {
          temperature,
          maxTokens
        })
      } catch (error: any) {
        const errorMessage = error.message || ''
        const isTokenError = errorMessage.includes('MAX_TOKENS') || 
                           errorMessage.includes('输出超过最大长度') ||
                           errorMessage.includes('token limit')

        if (isTokenError && attempt < maxRetries) {
          attempt++
          console.log(`Token limit exceeded, retrying with attempt ${attempt}...`)
          continue // 重试
        }
        
        // 如果不是token错误或已达最大重试次数，抛出错误
        throw error
      }
    }

    throw new Error('重试次数已达上限，请简化问题或使用其他AI提供商')
  }

  // 判断用户输入是否需要电路设计
  private isCircuitDesignQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase()
    
    // 首先检查是否是简单的问候或日常对话
    const casualPatterns = [
      /^(hi|hello|你好|在吗|嗨|哈喽)[\s\?！。]*$/i,
      /^(how are you|你好吗|最近怎么样)[\s\?！。]*$/i,
      /^(thank you|thanks|谢谢|谢了)[\s\?！。]*$/i,
      /^(bye|goodbye|再见|拜拜)[\s\?！。]*$/i,
      /^(ok|好的|明白|收到)[\s\?！。]*$/i,
      /^(what('s| is) (your name|this)|这是什么|你是谁)[\s\?！。]*$/i
    ]

    // 如果是简单问候，返回false（不需要电路设计）
    if (casualPatterns.some(pattern => pattern.test(message))) {
      return false
    }

    // 检查是否包含电路设计相关关键词（扩展关键词列表）
    const circuitKeywords = [
      '电路', '设计', '原理图', '电阻', '电容', '电感', '二极管', '三极管', 
      'led', 'circuit', 'resistor', 'capacitor', 'diode', 'transistor',
      '稳压', '放大器', '滤波器', '振荡器', '电源', '功率', '电压', '电流',
      'regulator', 'amplifier', 'filter', 'oscillator', 'power', 'voltage', 'current',
      '运放', 'ic', '芯片', '单片机', 'mcu', 'arduino', 'esp32',
      'bom', '物料', '元件', 'component', '焊接', 'pcb', 'sch',
      'ascii', '电路图', 'schematic', '原理', 'diagram', '接线', '连接',
      'lm', 'ne555', '555', '开关', 'switch', '继电器', 'relay', '传感器'
    ]

    // 检查是否包含电路设计相关的词汇
    const hasCircuitKeywords = circuitKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    )

    // 如果包含电路关键词，认为需要电路设计
    if (hasCircuitKeywords) {
      return true
    }

    // 检查是否是问题格式（包含疑问词）
    const questionPatterns = [
      /[？\?]/, // 包含问号
      /^(什么|怎么|如何|为什么|when|what|how|why|where|which|can|could|should|would)/,
      /(吗|呢|吧)[\s\?！。]*$/,
      /^(请|帮|help|please)/
    ]

    const isQuestion = questionPatterns.some(pattern => pattern.test(lowerMessage))
    
    // 如果是问题但不包含电路关键词，可能是一般性询问
    if (isQuestion && message.length > 10) {
      // 长问题但没有电路关键词，可能仍然是技术相关，更倾向于电路设计
      return true
    }

    // 如果消息较长且不是明显的日常对话，倾向于认为是技术询问
    return message.length > 15
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
    console.log('=== extractCircuitData Debug ===')
    console.log('Content preview:', content.substring(0, 500))
    
    // 1. 首先检查代码块中的ASCII电路图
    const codeBlockRegex = /```[\s\S]*?```/g
    const codeBlocks = content.match(codeBlockRegex)
    
    if (codeBlocks) {
      for (const block of codeBlocks) {
        const cleanBlock = block.replace(/```[a-zA-Z]*\n?/g, '').replace(/```$/g, '').trim()
        if (this.isCircuitDiagram(cleanBlock)) {
          console.log('Found circuit diagram in code block')
          return {
            ascii: cleanBlock,
            description: this.extractDescription(content),
            components: this.circuitGenerator.extractComponents(cleanBlock),
            properties: this.circuitGenerator.extractProperties(content),
            connections: this.circuitGenerator.extractConnections(cleanBlock)
          }
        }
      }
    }
    
    // 2. 检查整个内容中的ASCII电路图（不在代码块中的）
    if (this.isCircuitDiagram(content)) {
      console.log('Found circuit diagram in full content')
      return {
        ascii: content,
        description: this.extractDescription(content),
        components: this.circuitGenerator.extractComponents(content),
        properties: this.circuitGenerator.extractProperties(content),
        connections: this.circuitGenerator.extractConnections(content)
      }
    }
    
    // 3. 如果AI响应了电路设计但没有明显的ASCII图，生成一个基础电路图
    const hasCircuitTerms = this.hasCircuitDesignContent(content)
    if (hasCircuitTerms) {
      console.log('Found circuit design content, generating ASCII diagram')
      const components = this.circuitGenerator.extractComponents(content)
      const asciiDiagram = this.circuitGenerator.generateASCIICircuit(components, [])
      
      return {
        ascii: asciiDiagram,
        description: this.extractDescription(content),
        components: components,
        properties: this.circuitGenerator.extractProperties(content),
        connections: this.circuitGenerator.extractConnections(content)
      }
    }
    
    console.log('No circuit data found')
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
      /VCC|GND|VDD|VSS/i, // 电源标识
      /[-]{3,}/, // 连接线
      /R\d+|C\d+|L\d+|U\d+|D\d+|LED\d*/, // 元件标号
      /电路.*?图|原理.*?图|schematic/i, // 电路图标识
      /\|[\s\S]*\|/, // 可能的表格形式电路图
      /┌|─|└|├|┤|┬|┴|┼/, // 表格边框字符
      /\+[\s]*[-]+[\s]*\+/, // ASCII表格边框
    ]
    
    // 至少匹配两个模式才认为是电路图
    const matchCount = circuitPatterns.filter(pattern => pattern.test(text)).length
    return matchCount >= 2
  }

  private hasCircuitDesignContent(content: string): boolean {
    const circuitContentPatterns = [
      /电路.*?设计/i,
      /原理.*?图/i,
      /元件.*?选择/i,
      /电阻.*?\d+/i,
      /电容.*?\d+/i,
      /稳压.*?电路/i,
      /放大.*?电路/i,
      /滤波.*?电路/i,
      /BOM|物料.*?清单/i,
      /R\d+.*?\d+.*?Ω/i,
      /C\d+.*?\d+.*?(μF|nF|pF)/i,
      /U\d+.*?LM\d+/i,
      /电源.*?\d+.*?V/i,
      /电流.*?\d+.*?(mA|A)/i
    ]
    
    return circuitContentPatterns.some(pattern => pattern.test(content))
  }

  private extractDescription(content: string): string {
    // 提取描述信息，优先查找"描述"、"说明"等关键词后的内容
    const descriptionPatterns = [
      /描述[:：]\s*([^。\n]+)/,
      /说明[:：]\s*([^。\n]+)/,
      /原理[:：]\s*([^。\n]+)/,
      /功能[:：]\s*([^。\n]+)/
    ]
    
    for (const pattern of descriptionPatterns) {
      const match = content.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    // 如果没有找到明确的描述，返回默认描述
    return '电路原理图'
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