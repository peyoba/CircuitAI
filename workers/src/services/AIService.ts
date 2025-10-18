// 简化版AI服务，适配Cloudflare Workers
export class AIService {
  // 运行时环境变量（通过 Hono c.env 传入），避免使用 process.env
  private env: Record<string, string | undefined>

  constructor(env?: Record<string, string | undefined>) {
    this.env = env || {}
  }

  // 🔥 修复：使用更可靠的对话历史存储机制
  private static conversations: Map<string, Array<{role: string, content: string}>> = new Map()
  
  // 🔥 新增：默认API配置支持（仅从运行时环境获取，不再内置任何明文密钥）
  private getDefaultAPIConfig() {
    const apiKey = this.env?.DEFAULT_GEMINI_API_KEY

    if (!apiKey) {
      // 不再提供任何代码内置的后备密钥，强制要求在 Cloudflare 上配置 secret
      // 使用命令：wrangler secret put DEFAULT_GEMINI_API_KEY
      throw new Error('系统未配置默认AI密钥：请在 Cloudflare Workers 中设置 secret DEFAULT_GEMINI_API_KEY')
    }
    
    return {
      provider: 'gemini',
      apiKey: apiKey,
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-flash',
      maxTokens: 4000,
      temperature: 0.7
    }
  }
  
  // 🔥 新增：检查是否使用默认配置
  private static isDefaultProvider(provider: string): boolean {
    return provider === 'default' || provider === '智能AI助手'
  }
  
  // 🔥 新增：Token使用监控统计
  private static tokenStats = {
    totalRequests: 0,
    maxTokensErrors: 0,
    averageInputTokens: 0,
    averageOutputTokens: 0,
    providerStats: new Map<string, {requests: number, errors: number, tokens: number}>()
  }
  
  // 🔥 新增：记录token使用情况
  private recordTokenUsage(provider: string, inputLength: number, outputLength: number, hasError: boolean = false) {
    this.tokenStats.totalRequests++
    
    // 估算token使用（粗略估算：中文1字符≈1.5token，英文1字符≈0.25token）
    const estimatedInputTokens = Math.ceil(inputLength * 0.8) // 混合语言估算
    const estimatedOutputTokens = Math.ceil(outputLength * 0.8)
    
    if (hasError) {
      this.tokenStats.maxTokensErrors++
    }
    
    // 更新平均值
    this.tokenStats.averageInputTokens = 
      (this.tokenStats.averageInputTokens * (this.tokenStats.totalRequests - 1) + estimatedInputTokens) / this.tokenStats.totalRequests
    this.tokenStats.averageOutputTokens = 
      (this.tokenStats.averageOutputTokens * (this.tokenStats.totalRequests - 1) + estimatedOutputTokens) / this.tokenStats.totalRequests
    
    // 更新provider统计
    if (!this.tokenStats.providerStats.has(provider)) {
      this.tokenStats.providerStats.set(provider, {requests: 0, errors: 0, tokens: 0})
    }
    const providerStat = this.tokenStats.providerStats.get(provider)!
    providerStat.requests++
    providerStat.tokens += estimatedInputTokens + estimatedOutputTokens
    if (hasError) providerStat.errors++
    
    // 每10次请求输出统计
    if (this.tokenStats.totalRequests % 10 === 0) {
      console.log('📊 Token使用统计:', {
        总请求数: this.tokenStats.totalRequests,
        MAX_TOKENS错误率: `${((this.tokenStats.maxTokensErrors / this.tokenStats.totalRequests) * 100).toFixed(1)}%`,
        平均输入Tokens: this.tokenStats.averageInputTokens.toFixed(0),
        平均输出Tokens: this.tokenStats.averageOutputTokens.toFixed(0),
        提供商统计: Array.from(this.tokenStats.providerStats.entries()).map(([provider, stats]) => ({
          provider,
          成功率: `${((1 - stats.errors / stats.requests) * 100).toFixed(1)}%`,
          平均Tokens: Math.ceil(stats.tokens / stats.requests)
        }))
      })
    }
  }
  
  // 🔥 改进：确保对话历史的持久性和一致性
  private async getConversationHistory(conversationId: string): Promise<Array<{role: string, content: string}>> {
    let history = AIService.conversations.get(conversationId)
    if (!history) {
      history = []
      AIService.conversations.set(conversationId, history)
      console.log(`创建新对话历史，ID: ${conversationId}`)
    } else {
      console.log(`获取现有对话历史，ID: ${conversationId}, 长度: ${history.length}`)
    }
    return history
  }
  
  // 🔥 新增：保存对话历史到存储
  private async saveConversationHistory(conversationId: string, history: Array<{role: string, content: string}>) {
    AIService.conversations.set(conversationId, history)
    console.log(`保存对话历史，ID: ${conversationId}, 长度: ${history.length}`)
    
    // 限制存储的对话数量，避免内存占用过大
    if (AIService.conversations.size > 100) {
      const oldestKey = AIService.conversations.keys().next().value
      AIService.conversations.delete(oldestKey)
      console.log(`清理旧对话历史: ${oldestKey}`)
    }
  }

  // 判断用户输入是否需要电路设计
  private isCircuitDesignQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim()
    
    // 首先检查是否是简单的问候或日常对话
    const casualPatterns = [
      /^(hi|hello|你好|在吗|嗨|哈喽)[\s\?！。]*$/i,
      /^(how are you|你好吗|最近怎么样)[\s\?！。]*$/i,
      /^(thank you|thanks|谢谢|谢了)[\s\?！。]*$/i,
      /^(bye|goodbye|再见|拜拜)[\s\?！。]*$/i,
      /^(ok|好的|明白|收到)[\s\?！。]*$/i,
      /^(what('s| is) (your name|this)|这是什么|你是谁)[\s\?！。]*$/i
    ]

    console.log('检查消息:', message)
    console.log('标准化后:', lowerMessage)
    
    // 如果是简单问候，返回false（不需要电路设计）
    for (const pattern of casualPatterns) {
      if (pattern.test(lowerMessage)) {
        console.log('匹配到问候模式:', pattern)
        return false
      }
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
      console.log('检测到电路关键词，判断为电路设计')
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
      console.log('检测为长问题，可能是技术相关，更倾向于电路设计')
      return true
    }

    // 如果消息较长且不是明显的日常对话，倾向于认为是技术询问
    console.log('最终判断，消息长度:', message.length)
    return message.length > 15
  }
  
  async chat(message: string, conversationId: string, provider: string, apiConfig: any) {
    try {
      console.log('AIService.chat 开始:', { provider, hasApiConfig: !!apiConfig, messageLength: message.length })
      
      // 生成或使用现有的会话ID
      if (!conversationId) {
        conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      
      // 获取对话历史
      const conversationHistory = await this.getConversationHistory(conversationId)
      console.log('对话历史长度:', conversationHistory.length)
      
      // 添加用户消息到历史
      conversationHistory.push({
        role: 'user',
        content: message
      })
      
      // 判断是否需要电路设计
      const needsCircuitDesign = this.isCircuitDesignQuery(message)
      console.log('=== AI Service Debug ===')
      console.log('User message:', message)
      console.log('Needs circuit design:', needsCircuitDesign)
      console.log('========================')
      
      // 限制历史消息数量，避免token过多 - Gemini需要更严格的限制
      if (conversationHistory.length > 12) {  // 从20减少到12
        conversationHistory.splice(0, conversationHistory.length - 12)
      }
      
      // 构建包含历史的完整消息 (仅某些provider需要)
      let fullPrompt = ''
      if (provider === 'claude') {
        console.log('构建Claude提示词...')
        fullPrompt = this.buildPromptWithHistory(message, conversationHistory)
      }
      
      // 🔥 新增：检查是否使用默认配置
      let actualConfig = apiConfig
      let actualProvider = provider
      
      if (AIService.isDefaultProvider(provider) || 
          (apiConfig && AIService.isDefaultProvider(apiConfig.provider))) {
        // 使用系统内置的默认配置
        console.log('使用系统默认API配置 (Gemini)')
        actualConfig = AIService.getDefaultAPIConfig()
        actualProvider = 'gemini'
      }
      
      console.log('实际使用的provider:', actualProvider)
      
      // 根据provider调用不同的AI服务
      let response: any
      console.log(`调用 ${provider} provider...`)
      
      switch (actualProvider) {
        case 'openai':
          // 检查是否是自定义OpenAI API
          if (actualConfig?.apiUrl && !actualConfig.apiUrl.includes('api.openai.com')) {
            console.log('使用自定义OpenAI兼容API')
            response = await this.callCustomAPI(message, actualConfig, conversationHistory, needsCircuitDesign)
          } else {
            response = await this.callOpenAI(message, actualConfig, conversationHistory, needsCircuitDesign)
          }
          break
        case 'claude':
          {
            const requestFormat = actualConfig?.requestFormat
            const apiUrl = actualConfig?.apiUrl || ''
            const looksLikeClaudeEndpoint = /anthropic\.com/i.test(apiUrl) || /\/messages(\/?$)/i.test(apiUrl)

            // 如果是标准Claude API，使用专门的Claude方法
            if ((requestFormat === 'claude' || looksLikeClaudeEndpoint) && apiUrl.includes('anthropic.com')) {
              response = await this.callClaude(fullPrompt, actualConfig)
            } else {
              // 否则使用通用的Custom API方法
              console.log('Claude provider: 使用Custom API方法，URL:', apiUrl)
              response = await this.callCustomAPI(message, actualConfig, conversationHistory, needsCircuitDesign)
            }
          }
          break
        case 'gemini':
          // 检查是否是标准Gemini API
          if (actualConfig?.apiUrl && actualConfig.apiUrl.includes('generativelanguage.googleapis.com')) {
            response = await this.callGemini(message, actualConfig, conversationHistory, needsCircuitDesign)
          } else {
            console.log('Gemini provider: 使用Custom API方法，URL:', actualConfig?.apiUrl)
            response = await this.callCustomAPI(message, actualConfig, conversationHistory, needsCircuitDesign)
          }
          break
        case 'doubao':
          // 检查是否是标准豆包API
          if (apiConfig?.apiUrl && (apiConfig.apiUrl.includes('volces.com') || apiConfig.apiUrl.includes('ark.cn'))) {
            response = await this.callOpenAI(message, { ...apiConfig, apiUrl: (apiConfig?.apiUrl || 'https://ark.cn-beijing.volces.com/api/v3') + '/chat/completions' }, conversationHistory, needsCircuitDesign)
          } else {
            console.log('Doubao provider: 使用Custom API方法，URL:', apiConfig?.apiUrl)
            response = await this.callCustomAPI(message, apiConfig, conversationHistory, needsCircuitDesign)
          }
          break
        case 'siliconflow':
          // SiliconFlow使用OpenAI兼容格式
          console.log('SiliconFlow请求，原始配置:', apiConfig?.apiUrl)
          response = await this.callOpenAI(message, apiConfig, conversationHistory, needsCircuitDesign)
          break
        case 'qwen':
          response = await this.callOpenAI(message, { ...apiConfig, apiUrl: (apiConfig?.apiUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1') + '/chat/completions' }, conversationHistory, needsCircuitDesign)
          break
        case 'perplexity':
          response = await this.callOpenAI(message, { ...apiConfig, apiUrl: (apiConfig?.apiUrl || 'https://api.perplexity.ai') + '/chat/completions' }, conversationHistory, needsCircuitDesign)
          break
        case 'custom':
          response = await this.callCustomAPI(message, apiConfig, conversationHistory, needsCircuitDesign)
          break
        case 'mock':
          response = await this.mockResponse(message, conversationHistory)
          break
        default:
          throw new Error(`不支持的提供商: ${provider}`)
      }
      
      console.log(`${provider} provider 调用完成，响应类型:`, typeof response)
      
      // 🔥 记录token使用情况
      const inputLength = message.length + (conversationHistory?.length || 0) * 50 // 估算输入长度
      const outputLength = response?.response?.length || 0
      const hasError = !response || !response.response
      this.recordTokenUsage(provider, inputLength, outputLength, hasError)
      
      // 🔥 修复：将AI响应添加到历史并持久化保存
      if (response && response.response) {
        conversationHistory.push({
          role: 'assistant',
          content: response.response
        })
        // 立即保存更新后的对话历史
        await this.saveConversationHistory(conversationId, conversationHistory)
      }
      
      // **关键修复**：对所有AI提供商都进行数据提取（添加超时保护）
      if (response && response.response && provider !== 'mock') {
        console.log('开始提取电路数据，响应长度:', response.response.length)
        try {
          // 预先声明变量，避免未声明引用导致的运行时错误
          let circuit_data: any = null
          let bom_data: any = null
          // 添加数据提取超时保护
          const extractionPromise = this.extractDataFromResponse(response.response)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('数据提取超时')), 10000) // 10秒超时
          )
          
          const extractionResult = await Promise.race([extractionPromise, timeoutPromise]) as any
          circuit_data = extractionResult?.circuit_data
          bom_data = extractionResult?.bom_data
          console.log('提取结果:', { 
            hasCircuitData: !!circuit_data, 
            hasBomData: !!bom_data,
            circuitComponents: circuit_data?.components?.length || 0,
            bomItems: bom_data?.items?.length || 0
          })
          
          // 覆盖原有的数据
          if (circuit_data) response.circuit_data = circuit_data
          if (bom_data) response.bom_data = bom_data
        } catch (extractError) {
          console.error('数据提取失败或超时:', extractError.message)
          // 即使提取失败，也不影响基本的聊天功能
        }
      }
      
      // 返回响应，包含会话ID
      return {
        ...response,
        conversationId: conversationId,
        conversation_id: conversationId
      }
    } catch (error: any) {
      console.error(`❌ AIService.chat ${provider} 详细错误:`, {
        message: error.message,
        stack: error.stack?.substring(0, 500),
        conversationId: conversationId,
        messageLength: message.length,
        hasApiConfig: !!apiConfig,
        timestamp: new Date().toISOString()
      })
      
      // 🔥 记录错误统计
      const isMaxTokensError = error.message.includes('MAX_TOKENS') || error.message.includes('token')
      this.recordTokenUsage(provider, message.length, 0, isMaxTokensError)
      
      // 记录详细错误信息，不使用降级机制
      console.error(`❌ ${provider} provider 调用失败，需要真正修复API问题`)
      
      // 重新抛出错误，保持错误的原始信息
      throw new Error(`${provider} provider调用失败: ${error.message}`)
    }
  }

  async testConfig(config: any) {
    try {
      console.log('开始真实API配置测试:', { 
        provider: config.provider, 
        hasApiUrl: !!config.apiUrl,
        hasApiKey: !!config.apiKey,
        model: config.model 
      })
      
      // 真实的API测试：发送一个简单的问题并验证响应
      const testMessage = "请回答：这是一个API连接测试，请简单回复'测试成功'"
      const response = await this.callCustomAPI(testMessage, config, undefined)
      
      console.log('API测试响应:', { 
        hasResponse: !!response.response,
        responseLength: response.response?.length || 0,
        responsePreview: response.response?.substring(0, 100)
      })
      
      // 验证响应是否有效
      if (!response || !response.response || response.response.length < 5) {
        throw new Error('API返回的响应无效或太短')
      }
      
      // 检查响应是否包含预期内容（不强制要求，但记录日志）
      const hasExpectedContent = response.response.toLowerCase().includes('测试') || 
                                response.response.toLowerCase().includes('成功') ||
                                response.response.toLowerCase().includes('test')
      
      console.log('API测试验证结果:', {
        responseValid: true,
        hasExpectedContent,
        actualResponse: response.response.substring(0, 200)
      })
      
      return {
        isValid: true,
        provider: config.provider,
        model: config.model,
        testResponse: response.response.substring(0, 100) + (response.response.length > 100 ? '...' : ''),
        responseLength: response.response.length
      }
    } catch (error) {
      console.error('API配置测试失败:', {
        provider: config.provider,
        error: error.message,
        stack: error.stack?.substring(0, 300)
      })
      
      return {
        isValid: false,
        provider: config.provider,
        error: error.message,
        details: '真实API调用失败，请检查配置参数'
      }
    }
  }

  private async callCustomAPI(message: string, config: any, conversationHistory?: Array<{role: string, content: string}>, needsCircuitDesign?: boolean) {
    try {
      // 首先检查config是否存在
      if (!config) {
        throw new Error('Custom API配置为空，请设置API URL、密钥和模型')
      }
      
      const { apiUrl, apiKey, model, customHeaders } = config
      
      console.log('🚀 Custom API调用开始:', { 
        hasConfig: !!config,
        apiUrl: apiUrl?.substring(0, 50) + '...', 
        model, 
        hasApiKey: !!apiKey,
        messageLength: message.length,
        historyLength: conversationHistory?.length || 0,
        timestamp: new Date().toISOString()
      })
      
      if (!apiUrl || !apiKey || !model) {
        throw new Error(`Custom API配置不完整: apiUrl=${!!apiUrl}, apiKey=${!!apiKey}, model=${!!model}`)
      }
      
      // 🔥 修复：实现Custom API的对话历史支持
      const messages = this.buildCustomAPIMessages(message, conversationHistory)
      
      const requestBody = {
        model,
        messages: messages,
        max_tokens: needsCircuitDesign ? 1500 : 800, // 🔥 根据需求调整token限制
        temperature: 0.7
      }
      
      // 智能处理不同API的路径
      let fullUrl = apiUrl
      if (apiUrl.includes('volces.com') || apiUrl.includes('ark.cn')) {
        // 豆包API格式
        fullUrl = `${apiUrl}/chat/completions`
      } else if (!apiUrl.includes('/chat/completions') && !apiUrl.includes('/v1/chat/completions')) {
        // 标准OpenAI格式
        fullUrl = `${apiUrl}/v1/chat/completions`
      }
      
      console.log('📤 Custom API请求详情:', { 
        url: fullUrl, 
        messageCount: requestBody.messages.length,
        modelUsed: requestBody.model,
        maxTokens: requestBody.max_tokens,
        temperature: requestBody.temperature
      })
      
      // 🔥 添加超时控制，防止长时间等待
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(customHeaders || {})
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      console.log('Custom API响应状态:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Custom API错误响应:', { 
          status: response.status, 
          statusText: response.statusText, 
          body: errorText 
        })
        throw new Error(`Custom API调用失败: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Custom API响应数据结构:', Object.keys(data))
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Custom API响应格式异常:', data)
        throw new Error('Custom API返回数据格式异常')
      }
      
      const responseText = data.choices[0].message.content
      console.log('Custom API调用成功，响应长度:', responseText.length)
      
      // 不在这里提取数据，让chat方法统一处理
      return {
        response: responseText,
        conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: 'custom'
      }
    } catch (error) {
      console.error('Custom API调用异常:', error)
      if (error.message.includes('fetch')) {
        throw new Error('Custom API网络连接失败，请检查API地址和网络连接')
      } else if (error.message.includes('401')) {
        throw new Error('Custom API密钥无效或已过期')
      } else if (error.message.includes('403')) {
        throw new Error('Custom API访问被拒绝，请检查API密钥权限')
      } else {
        throw new Error(`Custom API调用失败: ${error.message}`)
      }
    }
  }

  private async callOpenAI(message: string, config: any, conversationHistory?: Array<{role: string, content: string}>, needsCircuitDesign?: boolean) {
    const { apiKey, model = 'gpt-3.5-turbo', customHeaders } = config
    
    console.log('callOpenAI 调试信息:')
    console.log('- 配置:', { apiUrl: config?.apiUrl, model, hasApiKey: !!apiKey })
    console.log('- needsCircuitDesign:', needsCircuitDesign)
    
    // 规范化 API 路径，确保指向 /v1/chat/completions
    let base = (config && config.apiUrl && config.apiUrl.startsWith('http')) ? config.apiUrl.replace(/\/$/, '') : 'https://api.openai.com/v1'
    let fullUrl = base
    if (!/\/chat\/completions$/.test(base)) {
      if (/\/v1$/.test(base)) {
        fullUrl = `${base}/chat/completions`
      } else if (/\/v1\/.+/.test(base)) {
        // 已经包含 /v1/xxx 的完整路径
        fullUrl = base
      } else {
        fullUrl = `${base}/v1/chat/completions`
      }
    }

    console.log('- 最终URL:', fullUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(customHeaders || {})
      },
      body: JSON.stringify({
        model,
        messages: this.buildOpenAIMessages(message, conversationHistory, needsCircuitDesign),
        max_tokens: needsCircuitDesign ? 1500 : 800, // 🔥 根据需求调整token限制
        temperature: 0.7
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenAI API调用失败: ${response.status} ${response.statusText} - ${errText}`)
    }

    const data = await response.json()
    const responseText = data.choices[0].message.content
    
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'openai'
    }
  }

  private async callClaude(message: string, config: any) {
    const { apiKey, model = 'claude-3-5-sonnet-20240620', apiUrl, customHeaders, authMode } = config

    // 归一化 Anthropic API 路径，默认 https://api.anthropic.com/v1/messages
    let base = (apiUrl && apiUrl.startsWith('http'))
      ? apiUrl.replace(/\/$/, '')
      : 'https://api.anthropic.com'
    let fullUrl = base
    if (!/\/v1\/messages$/.test(base)) {
      if (/\/v1$/.test(base)) {
        fullUrl = `${base}/messages`
      } else if (/\/v1\/.+/.test(base)) {
        fullUrl = base
      } else {
        fullUrl = `${base}/v1/messages`
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000) // 45s 超时

    // 构建请求头：默认仅使用 Authorization: Bearer；如需 x-api-key 或 anthropic-version，请通过 customHeaders 传入，或设置 authMode='x-api-key'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders || {})
    }
    if (authMode === 'x-api-key' || headers['x-api-key']) {
      headers['x-api-key'] = headers['x-api-key'] || apiKey
      delete headers['Authorization']
    } else {
      headers['Authorization'] = headers['Authorization'] || `Bearer ${apiKey}`
      delete headers['x-api-key']
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        // 按 Anthropic Messages API 要求，content 使用块数组更稳妥
        messages: [
          { role: 'user', content: [{ type: 'text', text: message }] }
        ]
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Claude API调用失败: ${response.status} ${response.statusText} - ${errText}`)
    }

    const data = await response.json()
    // data.content 形如 [{type:'text', text:'...'}]
    const responseText = Array.isArray(data.content) && data.content[0]
      ? (data.content[0].text || '')
      : ''
    
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'claude'
    }
  }

  private async callGemini(message: string, config: any, conversationHistory?: Array<{role: string, content: string}>, needsCircuitDesign?: boolean) {
    try {
    const { apiKey, model = 'gemini-pro' } = config
    
      if (!apiKey) {
        throw new Error('Gemini API Key 未配置')
      }
      
      console.log('Gemini API调用开始:', { 
        model, 
        messageLength: message.length, 
        historyLength: conversationHistory?.length || 0,
        timestamp: new Date().toISOString()
      })
      
      // 🔥 大幅简化输入以避免MAX_TOKENS错误
      const contents: any[] = []
      
      // 检查是否是首次对话
      const isFirstMessage = !conversationHistory || conversationHistory.length === 1 // 只有当前用户消息
      
      if (isFirstMessage) {
        // 首次对话，使用极简系统提示词（移除语言强制）
        if (needsCircuitDesign) {
          contents.push({
            role: 'user',
            parts: [{ text: `你是电路设计专家，请设计：${message.substring(0, 200)}` }]
          })
        } else {
          contents.push({
            role: 'user',  
            parts: [{ text: `你是智能助手：${message.substring(0, 250)}` }]
          })
        }
        console.log('使用极简提示词 - 首次对话')
      } else {
        // 后续对话，只保留最近2轮对话
        console.log('使用对话历史 - 后续对话，历史长度:', conversationHistory.length)
        
        // 极简上下文提示
        contents.push({
          role: 'user',
          parts: [{ text: '继续电路设计对话' }]
        })
        
        // 只添加最近1轮对话，大幅缩短内容
        const recentHistory = conversationHistory.slice(-2, -1) // 最多1条消息
        for (const msg of recentHistory) { 
          if (msg.role === 'user') {
            contents.push({
              role: 'user',
              parts: [{ text: msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content }]
            })
          } else if (msg.role === 'assistant') {
            // 助手回复只保留前40字符
            const shortContent = msg.content.length > 40 ? msg.content.substring(0, 40) + '...' : msg.content
            contents.push({
              role: 'model',
              parts: [{ text: shortContent }]
            })
          }
        }
        
        // 添加当前用户消息（限制长度）
        contents.push({
          role: 'user',
          parts: [{ text: message.substring(0, 200) }] // 限制到200字符
        })
      }
      
      const requestBody = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 10, // 进一步减少
          topP: 0.8,
          maxOutputTokens: 400, // 🔥 降至400以避免MAX_TOKENS错误
          candidateCount: 1
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      }
      
      console.log('Gemini请求体:', JSON.stringify(requestBody, null, 2))
      
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      console.log('Gemini API URL:', apiUrl)
      
      const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
        body: JSON.stringify(requestBody)
      })

      console.log('Gemini响应状态:', response.status, response.statusText)

    if (!response.ok) {
        const errorText = await response.text()
        console.error('Gemini API错误响应:', { 
          status: response.status, 
          statusText: response.statusText, 
          body: errorText,
          url: apiUrl
        })
        throw new Error(`Gemini API调用失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

          const data = await response.json()
      console.log('Gemini响应数据结构:', Object.keys(data))
      console.log('Gemini完整响应:', JSON.stringify(data, null, 2))
      
      // 详细检查响应结构
      if (!data.candidates) {
        console.error('缺少candidates字段:', data)
        throw new Error('Gemini API返回缺少candidates字段')
      }
      
      if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
        console.error('candidates不是数组或为空:', data.candidates)
        throw new Error('Gemini API返回candidates为空')
      }
      
      if (!data.candidates[0]) {
        console.error('candidates[0]为空:', data.candidates)
        throw new Error('Gemini API返回candidates[0]为空')
      }
      
      if (!data.candidates[0].content) {
        console.error('candidates[0].content为空:', data.candidates[0])
        throw new Error('Gemini API返回content为空')
      }
      
      // 检查是否被安全过滤器阻止
      if (data.candidates[0].finishReason === 'SAFETY') {
        console.error('响应被安全过滤器阻止:', data.candidates[0])
        throw new Error('Gemini API响应被安全过滤器阻止，请调整安全设置或修改问题')
      }
      
      if (!data.candidates[0].content.parts) {
        console.error('candidates[0].content.parts为空:', data.candidates[0].content)
        console.error('可能原因: finishReason =', data.candidates[0].finishReason)
        throw new Error(`Gemini API返回parts为空，原因: ${data.candidates[0].finishReason || '未知'}`)
      }
      
      if (!Array.isArray(data.candidates[0].content.parts) || data.candidates[0].content.parts.length === 0) {
        console.error('parts不是数组或为空:', data.candidates[0].content.parts)
        console.error('可能原因: finishReason =', data.candidates[0].finishReason)
        throw new Error(`Gemini API返回parts数组为空，原因: ${data.candidates[0].finishReason || '未知'}`)
      }
      
      if (!data.candidates[0].content.parts[0]) {
        console.error('parts[0]为空:', data.candidates[0].content.parts)
        throw new Error('Gemini API返回parts[0]为空')
      }
      
      if (!data.candidates[0].content.parts[0].text) {
        console.error('parts[0].text为空:', data.candidates[0].content.parts[0])
        throw new Error('Gemini API返回text为空')
      }
      
      const responseText = data.candidates[0].content.parts[0].text
      console.log('Gemini API调用成功，响应长度:', responseText.length)
      
    return {
        response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'gemini'
      }
    } catch (error) {
      console.error('Gemini API调用异常:', error)
      if (error.message.includes('timeout')) {
        throw new Error('Gemini API调用超时，请检查网络连接或稍后重试')
      } else if (error.message.includes('401')) {
        throw new Error('Gemini API密钥无效或已过期')
      } else if (error.message.includes('403')) {
        throw new Error('Gemini API访问被拒绝，请检查API密钥权限')
      } else if (error.message.includes('429')) {
        throw new Error('Gemini API请求频率过高，请稍后重试')
      } else {
        throw new Error(`Gemini API调用失败: ${error.message}`)
      }
    }
  }

  private async mockResponse(message: string, history: Array<{role: string, content: string}>) {
    // 简单的mock响应
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 检查是否是后续对话
    const isFollowUp = history.length > 1
    const hasCircuitKeywords = message.includes('电路') || message.includes('设计') || message.includes('LED') || message.includes('稳压')
    
    let response = `Mock API 收到消息: "${message}"\n\n`
    let circuit_data: any = null
    let bom_data: any = null
    
    if (isFollowUp) {
      // 后续对话的回复
      if (message.includes('优化') || message.includes('改进') || message.includes('修改')) {
        response += `基于前面的设计，我建议以下优化方案：\n\n1. 增加滤波电容以提高稳定性\n2. 采用更精密的电阻以提高精度\n3. 添加保护电路防止过流\n\n这样可以让电路性能更佳。`
      } else if (message.includes('参数') || message.includes('计算')) {
        response += `根据前面的电路设计，关键参数计算如下：\n\n- 限流电阻：R = (Vin - Vf) / If = (5V - 2V) / 10mA = 300Ω\n- 功耗：P = I²R = (0.01A)² × 330Ω = 0.033W\n- 电流精度：±5% (取决于电阻精度)\n\n选择330Ω标准阻值比较合适。`
      } else {
        response += `基于我们前面讨论的电路，我理解您想了解更多技术细节。请告诉我您具体想了解哪个方面，我可以提供更详细的解释。

## 深入分析建议
基于前面的LED驱动电路，如果您想进一步了解：
1. **功耗计算**：当前电路功耗约为 P = I²R = (0.01A)² × 330Ω = 0.033W
2. **散热设计**：1/4W电阻足够，无需额外散热
3. **可靠性提升**：可以并联一个小电容改善稳定性
4. **成本优化**：使用标准阻值可以降低采购成本`
      }
    } else if (hasCircuitKeywords) {
      // 第一次电路设计请求 - 生成完整电路数据
      response = `根据您的需求，我为您设计了以下LED驱动电路：

## 电路设计

\`\`\`
     VCC
      |
     [R1]
      |
     LED1
      |
     GND
\`\`\`

## 电路说明
**设计原理：** 这是一个基本的LED驱动电路，通过限流电阻R1控制流过LED1的电流，确保LED安全工作。电路从VCC获取电源，经过R1限流后点亮LED1，最后通过GND形成完整回路。

**计算方法：** 限流电阻计算公式：R = (VCC - VF) / IF，其中VCC=5V，VF=2V(LED正向压降)，IF=10mA(LED工作电流)，因此R = (5-2)/0.01 = 300Ω，选择标准值330Ω。

**元件选型：** R1选择1/4W功率的金属膜电阻，精度5%；LED1选择标准3mm红色LED，正向电流10-20mA。

**设计注意事项：** 1.确保限流电阻功耗不超过额定值；2.LED极性不能接反；3.电源电压要稳定；4.PCB布线时注意电源和地线回路。

## 元件列表
| 位号 | 类型 | 型号/规格 | 参数值 | 封装 | 说明 |
|------|------|-----------|--------|------|------|
| R1   | 电阻 | 1/4W 5%   | 330Ω  | 0805 | 限流电阻 |
| LED1 | LED  | 标准LED   | 红色   | 3mm  | 指示灯 |

## 连接关系
| 序号 | 起始元件 | 起始引脚 | 目标元件 | 目标引脚 | 连接说明 |
|------|----------|----------|----------|----------|----------|
| 1    | VCC      | +        | R1       | 1        | 电源正极连接到电阻 |
| 2    | R1       | 2        | LED1     | +        | 电阻输出到LED正极 |
| 3    | LED1     | -        | GND      | -        | LED负极接地 |

## 物料清单(BOM)
| 序号 | 名称 | 型号 | 位号 | 数量 | 单价(元) | 备注 |
|------|------|------|------|------|----------|------|
| 1    | 电阻 | 330Ω/1/4W | R1 | 1 | 0.05 | 限流电阻 |
| 2    | LED  | 红色3mm    | LED1 | 1 | 0.15 | 指示灯 |`
      
      circuit_data = {
        ascii: `     VCC\n      |\n     [R1]\n      |\n     LED1\n      |\n     GND`,
        description: `设计原理：这是一个基本的LED驱动电路，通过限流电阻R1控制流过LED1的电流，确保LED安全工作。电路从VCC获取电源，经过R1限流后点亮LED1，最后通过GND形成完整回路。

计算方法：限流电阻计算公式：R = (VCC - VF) / IF，其中VCC=5V，VF=2V(LED正向压降)，IF=10mA(LED工作电流)，因此R = (5-2)/0.01 = 300Ω，选择标准值330Ω。

元件选型：R1选择1/4W功率的金属膜电阻，精度5%；LED1选择标准3mm红色LED，正向电流10-20mA。

设计注意事项：1.确保限流电阻功耗不超过额定值；2.LED极性不能接反；3.电源电压要稳定；4.PCB布线时注意电源和地线回路。`,
        components: [
          { 
            id: 'R1',
            name: 'R1', 
            type: 'resistor', 
            value: '1/4W 5% 330Ω', 
            reference: 'R1',
            model: '1/4W 5%'
          },
          { 
            id: 'LED1',
            name: 'LED1', 
            type: 'led', 
            value: '红色3mm', 
            reference: 'LED1',
            model: '标准LED'
          },
          { 
            id: 'VCC',
            name: 'VCC', 
            type: 'power', 
            value: '+5V', 
            reference: 'VCC',
            model: '电源'
          },
          { 
            id: 'GND',
            name: 'GND', 
            type: 'ground', 
            value: '0V', 
            reference: 'GND',
            model: '地线'
          }
        ],
        connections: [
          {
            id: 'conn1',
            from: { component: 'VCC' },
            to: { component: 'R1' },
            label: '电源连接',
            description: 'VCC连接到限流电阻R1'
          },
          {
            id: 'conn2', 
            from: { component: 'R1' },
            to: { component: 'LED1' },
            label: '信号连接',
            description: '电阻R1连接到LED1正极'
          },
          {
            id: 'conn3',
            from: { component: 'LED1' },
            to: { component: 'GND' },
            label: '地线连接',
            description: 'LED1负极连接到地线GND'
          }
        ]
      }
      
      bom_data = {
        items: [
          { component: 'R1', quantity: 1, value: '330Ω', package: '0805', price: 0.05 },
          { component: 'LED1', quantity: 1, value: '红色LED', package: '3mm', price: 0.15 }
        ],
        totalCost: 0.20
      }
    } else {
      // 非电路设计对话
      response += `这是一个模拟的AI响应，用于测试系统功能。我可以帮您解答技术问题或讨论电路设计。`
    }
    
    return {
      response,
      conversation_id: `mock_${Date.now()}`,
      provider: 'mock',
      circuit_data,
      bom_data
    }
  }

  // 从AI响应中提取电路数据和BOM数据 - 增强版
  private extractDataFromResponse(response: string) {
    console.log('开始智能提取，响应前500字符:', response.substring(0, 500))
    
    let circuit_data: any = null
    let bom_data: any = null
    
    // 1. 提取ASCII电路图
    circuit_data = this.extractCircuitData(response)
    
    // 2. 提取BOM数据 - 四层提取策略
    bom_data = this.extractBOMData(response, circuit_data)
    
    console.log('智能提取完成:', {
      hasCircuit: !!circuit_data,
      circuitComponents: circuit_data?.components?.length || 0,
      hasBOM: !!bom_data,
      bomItems: bom_data?.items?.length || 0
    })
    
    return { circuit_data, bom_data }
  }

  // 智能提取电路数据
  private extractCircuitData(response: string) {
    try {
      // 1. 寻找代码块中的电路图
      let ascii: string | null = null
      try {
        const codeBlockRegex = /```([^`]*?)```/gs
        const codeBlocks = Array.from(response.matchAll(codeBlockRegex))
        
        for (const match of codeBlocks) {
          const cleanBlock = match[1].trim()
          if (this.isCircuitDiagram(cleanBlock)) {
            ascii = cleanBlock
            break
          }
        }
      } catch (error: any) {
        console.log('代码块提取失败:', error.message)
      }
      
      // 2. 如果没找到代码块，寻找明显的电路结构
      if (!ascii) {
        try {
          ascii = this.findCircuitInText(response)
        } catch (error: any) {
          console.log('文本电路提取失败:', error.message)
        }
      }
      
      // 3. 提取电路描述、元件和连接
      let description = ''
      let components: any[] = []
      let connections: any[] = []
      
      try {
        description = this.extractDescription(response) || '电路设计说明'
      } catch (error: any) {
        console.log('描述提取失败:', error.message)
        description = '电路设计说明'
      }
      
      try {
        components = this.extractComponents(response) || []
      } catch (error: any) {
        console.log('元件提取失败:', error.message)
        components = []
      }
      
      try {
        connections = this.extractConnections(response) || []
      } catch (error: any) {
        console.log('连接提取失败:', error.message)
        connections = []
      }
      
      console.log('电路提取结果:', {
        hasAscii: !!ascii,
        asciiLength: ascii?.length || 0,
        description: description?.substring(0, 100) + '...',
        componentsCount: components.length,
        connectionsCount: connections.length
      })
      
      if (ascii || components.length > 0) {
        return {
          ascii: ascii || '// 电路图提取中...',
          description,
          components,
          connections
        }
      }
      
      return null
    } catch (error: any) {
      console.log('电路数据提取全部失败:', error.message)
      return null
    }
  }

  // 智能提取BOM数据
  private extractBOMData(response: string, circuit_data: any) {
    try {
      let bom_data: any = null
      
      // 策略1: 寻找明确的BOM表格
      try {
        bom_data = this.extractBOMFromTable(response)
        if (bom_data && bom_data.items && bom_data.items.length > 0) {
          console.log('策略1成功: BOM表格提取')
          return bom_data
        }
      } catch (error: any) {
        console.log('策略1失败:', error.message)
      }
      
      // 策略2: 从元件清单生成BOM
      try {
        if (circuit_data && circuit_data.components && circuit_data.components.length > 0) {
          bom_data = this.generateBOMFromComponents(circuit_data.components)
          if (bom_data && bom_data.items && bom_data.items.length > 0) {
            console.log('策略2成功: 元件清单生成BOM')
            return bom_data
          }
        }
      } catch (error: any) {
        console.log('策略2失败:', error.message)
      }
      
      // 策略3: 智能文本分析提取元件
      try {
        bom_data = this.intelligentBOMExtraction(response)
        if (bom_data && bom_data.items && bom_data.items.length > 0) {
          console.log('策略3成功: 智能文本分析')
          return bom_data
        }
      } catch (error: any) {
        console.log('策略3失败:', error.message)
      }
      
      // 策略4: 最后手段 - 正则模式匹配
      try {
        bom_data = this.forceExtractBOM(response)
        console.log('策略4: 正则匹配，结果:', bom_data?.items?.length || 0)
        return bom_data
      } catch (error: any) {
        console.log('策略4失败:', error.message)
        return null
      }
    } catch (error: any) {
      console.log('BOM提取全部失败:', error.message)
      return null
    }
  }

  // 在文本中寻找电路结构
  private findCircuitInText(response: string): string | null {
    // 寻找包含电路符号的段落
    const lines = response.split('\n')
    let circuitLines: string[] = []
    
    for (const line of lines) {
      if (this.isCircuitDiagram(line)) {
        circuitLines.push(line)
      }
    }
    
    if (circuitLines.length >= 3) { // 至少3行才算电路图
      return circuitLines.join('\n')
    }
    
    return null
  }

  // 🔥 优化：从明确的BOM表格中提取（增强版）
  private extractBOMFromTable(response: string) {
    console.log('开始BOM表格提取，响应长度:', response.length)
    
    // 增强的BOM表格识别模式
    const bomPatterns = [
      // 标准物料清单表格
      /## 物料清单\(BOM\)([\s\S]*?)(?=##|$)/gi,
      // 元件列表表格  
      /## 元件列表([\s\S]*?)(?=##|$)/gi,
      // 一般的BOM表格
      /(?:BOM|物料清单|元件清单)[\s\S]*?\|(.*?\|.*?\|.*?\|)/gi,
      // 表头模式
      /\|.*?序号.*?\|.*?名称.*?\|.*?型号.*?\|/gi,
      /\|.*?位号.*?\|.*?类型.*?\|.*?规格.*?\|/gi
    ]
    
    for (let i = 0; i < bomPatterns.length; i++) {
      const pattern = bomPatterns[i]
      const matches = Array.from(response.matchAll(pattern))
      console.log(`BOM模式${i + 1}匹配结果:`, matches.length)
      
      if (matches.length > 0) {
        const result = this.parseBOMTable(response, pattern)
        if (result && result.items && result.items.length > 0) {
          console.log(`BOM模式${i + 1}提取成功，项目数:`, result.items.length)
          return result
        }
      }
    }
    
    console.log('所有BOM表格模式都未匹配成功')
    return null
  }

  // 解析BOM表格
  private parseBOMTable(response: string, pattern: RegExp) {
    const items: any[] = []
    const lines = response.split('\n')
    
    let inTable = false
    let itemId = 1
    
    for (const line of lines) {
      // 检测表格开始
      if (pattern.test(line)) {
        inTable = true
        continue
      }
      
      // 解析表格行
      if (inTable && line.includes('|')) {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell)
        
        if (cells.length >= 3) {
          // 尝试解析为: 名称/位号 | 型号/规格 | 数量 | [其他]
          items.push({
            component: cells[0] || `COMP${itemId}`,
            model: cells[1] || 'Standard',
            quantity: this.extractNumber(cells[2]) || 1,
            value: cells[1] || '',
            package: cells[3] || 'Standard',
            price: cells[4] ? this.extractNumber(cells[4]) : this.getComponentPrice('standard'),
            description: cells.join(' ').substring(0, 50)
          })
          itemId++
        }
      }
      
      // 检测表格结束
      if (inTable && !line.includes('|') && line.trim() === '') {
        break
      }
    }
    
    return items.length > 0 ? { items, totalCost: items.reduce((sum, item) => sum + (item.price * item.quantity), 0) } : null
  }

  // 智能BOM提取
  private intelligentBOMExtraction(response: string) {
    const items: any[] = []
    const componentMatches = new Set() // 避免重复
    
    // 增强的元件识别模式
    const patterns = [
      // 运算放大器
      { pattern: /(LM\d+|OPA\d+|AD\d+|TL\d+)(\w*)/gi, type: 'ic', getName: (match) => match[0] },
      // 电阻
      { pattern: /(\d+(?:\.\d+)?[kKmM]?[Ω\u03A9Ω])/gi, type: 'resistor', getName: (match) => `R(${match[1]})` },
      // 电容
      { pattern: /(\d+(?:\.\d+)?[uUnNpPmM]?F)/gi, type: 'capacitor', getName: (match) => `C(${match[1]})` },
      // 具体IC型号
      { pattern: /(STM32\w+|ESP32|555|ATmega\w+)/gi, type: 'mcu', getName: (match) => match[0] },
      // 二极管
      { pattern: /(1N\d+|BAT\d+)/gi, type: 'diode', getName: (match) => match[0] },
      // 晶体管
      { pattern: /(2N\d+|BC\d+|IRLZ\d+|IRF\d+)/gi, type: 'transistor', getName: (match) => match[0] },
    ]
    
    let itemId = 1
    for (const { pattern, type, getName } of patterns) {
      const matches = Array.from(response.matchAll(pattern))
      
      for (const match of matches) {
        const componentName = getName(match)
        const key = `${type}_${componentName}`
        
        if (!componentMatches.has(key)) {
          componentMatches.add(key)
          
          items.push({
            component: componentName,
            model: this.getDefaultModel(type),
            quantity: 1,
            value: match[1] || componentName,
            package: this.getDefaultPackage(type),
            price: this.getComponentPrice(type),
            description: this.getComponentDescription(type, componentName)
          })
          itemId++
        }
      }
    }
    
    return items.length > 0 ? { 
      items, 
      totalCost: items.reduce((sum, item) => sum + (item.price * item.quantity), 0) 
    } : null
  }

  // 提取数字
  private extractNumber(text: string): number {
    const match = text.match(/(\d+(?:\.\d+)?)/)
    return match ? parseFloat(match[1]) : 0
  }
  
  // 判断是否是电路图
  private isCircuitDiagram(text: string): boolean {
    const circuitPatterns = [
      /VCC|GND|VDD|VSS/i,
      /R\d+|C\d+|L\d+|U\d+|D\d+/,
      /\[.*?\]|\+.*?\-/,
      /LED|resistor|capacitor/i,
      /\||\-|\+/
    ]
    
    return circuitPatterns.some(pattern => pattern.test(text))
  }
  
  // 从响应中提取组件 - 优先解析表格，后备ASCII
  private extractComponents(response: string) {
    // 首先尝试从"元件列表"表格中提取
    const tableComponents = this.extractComponentsFromTable(response)
    if (tableComponents.length > 0) {
      return tableComponents
    }
    
    // 如果没有表格，则从ASCII电路图中提取
    return this.extractComponentsFromASCII(response)
  }
  
  // 从元件列表表格中提取组件
  private extractComponentsFromTable(response: string) {
    const components: any[] = []
    const sectionMatch = response.match(/## 元件列表([\s\S]*?)(?=##|$)/i)
    
    if (sectionMatch) {
      const section = sectionMatch[1]
      const lines = section.split('\n')
      
      for (const line of lines) {
        // 匹配表格行格式: | 位号 | 类型 | 型号/规格 | 参数值 | 封装 | 说明 |
        const match = line.match(/\|\s*([A-Z]+\d*)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/)
        if (match) {
          const [, reference, type, model, value, pkg, description] = match
          
          components.push({
            id: reference.trim(),
            name: reference.trim(),
            type: this.normalizeComponentType(type.trim()),
            reference: reference.trim(),
            value: value.trim(),
            package: pkg.trim(),
            description: description.trim()
          })
        }
      }
    }
    
    return components
  }
  
  // 从ASCII电路图中提取组件（后备方案）
  private extractComponentsFromASCII(response: string) {
    const components: any[] = []
    
    // 提取ASCII电路图
    const codeBlockMatch = response.match(/```([\s\S]*?)```/)
    if (!codeBlockMatch) return components
    
    const ascii = codeBlockMatch[1]
    const lines = ascii.split('\n')
    const foundComponents = new Set()
    
    for (const line of lines) {
      const componentMatches = line.match(/\b([RLCUD]\d+)\b|\bLED\d*\b|\bVCC\b|\bGND\b|\[([^\[\]]+)\]/g)
      if (componentMatches) {
        for (let match of componentMatches) {
          if (match.includes('[')) {
            match = match.replace(/[\[\]]/g, '')
          }
          
          if (foundComponents.has(match)) continue
          foundComponents.add(match)
          
          let type = 'unknown'
          if (match.startsWith('R')) type = 'resistor'
          else if (match.startsWith('C')) type = 'capacitor'
          else if (match.startsWith('L')) type = 'inductor'
          else if (match.startsWith('U')) type = 'ic'
          else if (match.startsWith('D')) type = 'diode'
          else if (match.includes('LED')) type = 'led'
          else if (match === 'VCC') type = 'power'
          else if (match === 'GND') type = 'ground'
          
          if (type !== 'unknown') {
            components.push({
              id: match,
              name: match,
              type: type,
              reference: match,
              value: this.getComponentValue(match)
            })
          }
        }
      }
    }
    
    return components
  }
  
  // 标准化组件类型
  private normalizeComponentType(type: string): string {
    const typeMap: { [key: string]: string } = {
      '电阻': 'resistor',
      '电容': 'capacitor',
      '电感': 'inductor',
      'LED': 'led',
      '二极管': 'diode',
      'IC': 'ic',
      '芯片': 'ic',
      '电源': 'power',
      '地线': 'ground'
    }
    
    return typeMap[type] || type.toLowerCase()
  }
  
  // 提取电路描述 - 解析结构化响应
  private extractDescription(response: string): string {
    // 查找## 电路说明部分
    const sectionMatch = response.match(/## 电路说明([\s\S]*?)(?=##|$)/i)
    if (sectionMatch) {
      const section = sectionMatch[1]
      
      // 提取各个部分
      const principleMatch = section.match(/\*\*设计原理：\*\*(.*?)(?=\*\*|$)/s)
      const calculationMatch = section.match(/\*\*计算方法：\*\*(.*?)(?=\*\*|$)/s)
      const selectionMatch = section.match(/\*\*元件选型：\*\*(.*?)(?=\*\*|$)/s)
      const notesMatch = section.match(/\*\*设计注意事项：\*\*(.*?)(?=\*\*|$)/s)
      
      let description = ''
      if (principleMatch) description += `设计原理：${principleMatch[1].trim()}\n\n`
      if (calculationMatch) description += `计算方法：${calculationMatch[1].trim()}\n\n`
      if (selectionMatch) description += `元件选型：${selectionMatch[1].trim()}\n\n`
      if (notesMatch) description += `设计注意事项：${notesMatch[1].trim()}`
      
      return description.trim() || '根据AI分析生成的电路设计'
    }
    
    // 如果没有找到结构化描述，返回通用描述
    return '根据AI分析生成的电路设计'
  }
  
  // 提取连接关系 - 解析连接关系表格
  private extractConnections(response: string) {
    const connections: any[] = []
    const sectionMatch = response.match(/## 连接关系([\s\S]*?)(?=##|$)/i)
    
    if (sectionMatch) {
      const section = sectionMatch[1]
      const lines = section.split('\n')
      
      for (const line of lines) {
        // 匹配表格行格式: | 序号 | 起始元件 | 起始引脚 | 目标元件 | 目标引脚 | 连接说明 |
        const match = line.match(/\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/)
        if (match) {
          const [, id, fromComp, fromPin, toComp, toPin, description] = match
          
          connections.push({
            id: `conn_${id.trim()}`,
            from: { 
              component: fromComp.trim(),
              pin: fromPin.trim()
            },
            to: { 
              component: toComp.trim(),
              pin: toPin.trim()
            },
            label: '连接',
            description: description.trim()
          })
        }
      }
    }
    
    return connections
  }
  
  // 辅助方法：在行中查找组件
  private findComponentInLine(line: string): string | null {
    // 匹配标准组件格式，包括方括号格式
    const patterns = [
      /\b([RLCUD]\d+)\b/,  // 标准组件标号
      /\bLED\d*\b/,        // LED
      /\bVCC\b/,           // 电源
      /\bGND\b/,           // 地线
      /\[([^\[\]]+)\]/     // 方括号格式
    ]
    
    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        let component = match[1] || match[0]
        // 处理方括号格式
        if (component.includes('[')) {
          component = component.replace(/[\[\]]/g, '')
        }
        return component
      }
    }
    
    return null
  }
  
  // 获取组件值
  private getComponentValue(component: string): string {
    if (component.startsWith('R')) return '330Ω'
    if (component.includes('LED')) return '红色LED'
    if (component.startsWith('C')) return '10µF'
    if (component.startsWith('L')) return '10mH'
    if (component === 'VCC' || component === 'VDD') return '+5V'
    if (component === 'GND' || component === 'VSS') return '0V'
    return ''
  }
  
  // 从文本中提取BOM数据 - 解析BOM表格
  private extractBOMFromText(response: string) {
    const items: any[] = []
    const sectionMatch = response.match(/## 物料清单\(BOM\)([\s\S]*?)(?=##|$)/i)
    
    if (sectionMatch) {
      const section = sectionMatch[1]
      const lines = section.split('\n')
      
      for (const line of lines) {
        // 匹配表格行格式: | 序号 | 名称 | 型号 | 位号 | 数量 | 单价(元) | 备注 |
        const match = line.match(/\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*([^|]+)\s*\|/)
        if (match) {
          const [, id, name, model, reference, quantity, price, notes] = match
          
          items.push({
            component: reference.trim(),
            quantity: parseInt(quantity.trim()) || 1,
            value: model.trim(),
            package: this.getDefaultPackage(reference.trim()),
            price: parseFloat(price.trim()) || 0,
            description: notes.trim()
          })
        }
      }
    }
    
    if (items.length > 0) {
      const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      return { items, totalCost }
    }
    
    return null
  }
  
  // 获取组件价格
  private getComponentPrice(component: string): number {
    if (component.startsWith('R')) return 0.05 // 电阻
    if (component.includes('LED')) return 0.15 // LED
    if (component.startsWith('C')) return 0.08 // 电容
    if (component.startsWith('L')) return 0.12 // 电感
    if (component.startsWith('U')) return 1.50 // IC
    if (component.startsWith('D')) return 0.25 // 二极管
    return 0.10 // 默认价格
  }
  
  // 获取默认封装
  private getDefaultPackage(component: string): string {
    if (component.startsWith('R')) return '0805'
    if (component.includes('LED')) return '3mm'
    if (component.startsWith('C')) return '0805'
    if (component.startsWith('L')) return '1206'
    if (component.startsWith('U')) return 'SOIC-8'
    if (component.startsWith('D')) return 'SOD-123'
    return 'TBD'
  }
  
  // 基于组件生成BOM数据
  private generateBOMFromComponents(components: any[]) {
    const items: any[] = []
    
    for (const comp of components) {
      // 跳过电源和地线节点
      if (comp.type === 'power' || comp.type === 'ground') {
        continue
      }
      
      items.push({
        component: comp.reference,
        quantity: 1,
        value: comp.value || this.getComponentValue(comp.reference),
        package: this.getDefaultPackage(comp.reference),
        price: this.getComponentPrice(comp.reference)
      })
    }
    
    if (items.length > 0) {
      const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      return { items, totalCost }
    }
    
    return null
  }
  
  // 🔥 优化：极简提示词系统，基于用户成功案例
  private buildOptimizedPrompt(userMessage: string, needsCircuitDesign: boolean): string {
    if (needsCircuitDesign) {
      return `你是CircuitsAI的资深硬件电路设计总工程师，请设计：${userMessage.substring(0, 200)}`
    } else {
      return `你是CircuitsAI的智能助手：${userMessage.substring(0, 250)}`
    }
  }


  // 构建包含历史的提示词
  private buildPromptWithHistory(currentMessage: string, history: Array<{role: string, content: string}>): string {
      // 检查是否是首次对话
      const isFirstMessage = !conversationHistory || conversationHistory.length <= 1
      
      if (isFirstMessage) {
        // 首次对话，使用优化的极简提示词
        const needsCircuitDesign = this.isCircuitDesignQuery(currentMessage)
        return this.buildOptimizedPrompt(currentMessage, needsCircuitDesign)
      }

    // 构建极简的上下文提示词，包含历史对话
    let prompt = `你是CircuitsAI的资深硬件电路设计总工程师。${currentMessage.substring(0, 150)}

## 对话历史：
`
    
    // 添加最近的对话历史（最多2轮）
    const recentHistory = history.slice(-4)
    for (let i = 0; i < recentHistory.length - 1; i++) { // 不包括当前用户消息
      const msg = recentHistory[i]
      if (msg.role === 'user') {
        prompt += `\n**用户：** ${msg.content.substring(0, 80)}\n`
      } else if (msg.role === 'assistant') {
        // 只保留响应的前60字符，避免提示词过长
        const shortContent = msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content
        prompt += `**AI：** ${shortContent}\n`
      }
    }

    return prompt
  }

  // 构建Custom API消息格式（自然语言适应）
  private buildCustomAPIMessages(message: string, conversationHistory?: Array<{role: string, content: string}>) {
    const messages: any[] = []
    
    // 检查是否是首次对话
    const isFirstMessage = !conversationHistory || conversationHistory.length <= 1
    
    if (isFirstMessage) {
      // 首次对话，使用极简提示词
      const needsCircuitDesign = this.isCircuitDesignQuery(message)
      messages.push({ 
        role: 'system', 
        content: needsCircuitDesign ? '你是电路设计专家' : '你是智能助手' 
      })
      messages.push({ 
        role: 'user', 
        content: message.substring(0, 300) 
      })
      console.log('Custom API: 使用极简提示词 - 首次对话')
    } else {
      // 后续对话，极简处理
      console.log('Custom API: 使用对话历史 - 后续对话，历史长度:', conversationHistory.length)
      
      // 添加极简系统指导
      messages.push({ 
        role: 'system', 
        content: '继续电路设计对话' 
      })
      
      // 🔥 只添加最近2条消息
      const recentHistory = conversationHistory.slice(-3, -1) // 最多2条
      for (const msg of recentHistory) {
        messages.push({ 
          role: msg.role === 'assistant' ? 'assistant' : 'user', 
          // 🔥 大幅限制每条历史消息的长度
          content: msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content 
        })
      }
      
      // 添加当前用户消息
      messages.push({ 
        role: 'user', 
        content: message.substring(0, 300) // 🔥 限制当前消息长度
      })
    }
    
    console.log('Custom API messages构建完成，消息数量:', messages.length)
    return messages
  }

  // 构建OpenAI消息格式（自然语言适应）
  private buildOpenAIMessages(message: string, conversationHistory?: Array<{role: string, content: string}>, needsCircuitDesign?: boolean) {
    const messages: any[] = []
    
    // 如果是第一条消息，使用极简提示词
    if (!conversationHistory || conversationHistory.length <= 1) {
      if (needsCircuitDesign) {
        messages.push({ 
          role: 'system', 
          content: '你是电路设计专家' 
        })
        messages.push({ 
          role: 'user', 
          content: message.substring(0, 300) // 🔥 限制消息长度
        })
      } else {
        messages.push({ 
          role: 'system', 
          content: '你是智能助手' 
        })
        messages.push({ 
          role: 'user', 
          content: message.substring(0, 400) 
        })
      }
    } else {
      // 添加极简系统指导
      messages.push({ 
        role: 'system', 
        content: '继续电路设计对话' 
      })
      
      // 🔥 只添加最近2条消息
      const recentHistory = conversationHistory.slice(-3, -1) // 最多2条
      for (const msg of recentHistory) {
        messages.push({ 
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          // 🔥 大幅限制每条历史消息的长度
          content: msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content
        })
      }
      
      // 添加当前用户消息
      messages.push({ 
        role: 'user', 
        content: message.substring(0, 300) // 🔥 限制当前消息长度
      })
    }
    
    return messages
  }

  // 智能从专业回答中提取BOM - 增强版
  private forceExtractBOM(response: string) {
    const items: any[] = []
    
    // 扩展的元件识别模式
    const componentPatterns = [
      // 电阻模式
      { pattern: /([RC]\d+).*?(\d+[kKmMuUnN]?[Ω\u03A9Ω])/gi, type: 'resistor' },
      { pattern: /(电阻|resistor).*?(\d+[kKmMuUnN]?[Ω\u03A9Ω])/gi, type: 'resistor' },
      
      // 电容模式  
      { pattern: /([LC]\d+).*?(\d+[uUnNpPmMfF]?F)/gi, type: 'capacitor' },
      { pattern: /(电容|capacitor).*?(\d+[uUnNpPmMfF]?F)/gi, type: 'capacitor' },
      
      // LED模式
      { pattern: /(LED\d*).*?(红色|绿色|蓝色|白色|yellow|red|green|blue|\d+mm)/gi, type: 'led' },
      
      // IC模式 - 扩展常见型号
      { pattern: /(U\d+).*?(LM\d+|NE\d+|74\w+|ATmega\w+|STM32|ESP32|AD\d+|OPA\d+|TL\d+|MC\d+)/gi, type: 'ic' },
      { pattern: /(芯片|IC|运放|MCU).*?(LM\d+|NE\d+|74\w+|ATmega\w+|STM32|ESP32|AD\d+|OPA\d+|TL\d+)/gi, type: 'ic' },
      
      // 晶体管模式
      { pattern: /(Q\d+|M\d+).*?(2N\d+|BC\d+|MOSFET|IRLZ\d+|IRF\d+|BSS\d+)/gi, type: 'transistor' },
      { pattern: /(MOSFET|晶体管|三极管).*?(2N\d+|BC\d+|IRLZ\d+|IRF\d+|BSS\d+)/gi, type: 'transistor' },
      
      // 二极管
      { pattern: /(D\d+).*?(1N\d+|BAT\d+|肖特基|Schottky)/gi, type: 'diode' },
      
      // 电感
      { pattern: /(L\d+).*?(\d+[uUnNmM]?H)/gi, type: 'inductor' }
    ]
    
    let itemId = 1
    const foundComponents = new Set() // 避免重复
    
    componentPatterns.forEach(({ pattern, type }) => {
      let match
      while ((match = pattern.exec(response)) !== null) {
        const [fullMatch, reference, value] = match
        const componentKey = `${reference || type}_${value}`
        
        if (!foundComponents.has(componentKey)) {
          foundComponents.add(componentKey)
          
          // 尝试从上下文中提取更多信息
          const contextMatch = response.slice(Math.max(0, match.index - 100), match.index + 100)
          const modelMatch = contextMatch.match(/(型号|model|part).*?([A-Z0-9\-_]+)/i)
          const packageMatch = contextMatch.match(/(封装|package).*?(SOT|DIP|SOIC|TSSOP|QFN|BGA|\d+mm)/i)
          
          // 🔥 优化BOM项目结构，专注用户需求：型号/供应商/参数
          items.push({
            component: reference || `${type.toUpperCase()}${itemId}`,
            quantity: 1,
            value: value,
            model: modelMatch ? modelMatch[2] : this.getOptimizedModel(type, value),
            supplier: this.getRecommendedSupplier(type),
            parameters: this.getDetailedParameters(type, value),
            package: packageMatch ? packageMatch[2] : this.getDefaultPackage(reference || type),
            description: this.getComponentDescription(type, value)
          })
          itemId++
        }
      }
    })
    
    if (items.length > 0) {
      console.log('智能提取BOM成功，项目数:', items.length)
      return { items } // 移除totalCost，不需要价格信息
    }
    
    console.log('无法提取任何BOM数据')
    return null
  }

  // 🔥 优化：获取优化的具体型号
  private getOptimizedModel(type: string, value: string): string {
    const models = {
      'resistor': `${value} 1/4W ±5% 金属膜电阻`,
      'capacitor': `${value} X7R 陶瓷电容`,
      'led': `${value} 高亮度LED`,
      'ic': this.getSpecificICModel(value),
      'transistor': `${value} N沟MOSFET`,
      'diode': `${value} 快恢复二极管`,
      'inductor': `${value} 线绕电感`
    }
    return models[type] || `${value} 标准元件`
  }

  // 获取具体IC型号
  private getSpecificICModel(value: string): string {
    if (value.includes('LM')) return `${value} 线性稳压器`
    if (value.includes('NE555')) return 'NE555P 定时器IC'
    if (value.includes('OPA')) return `${value} 运算放大器`
    if (value.includes('74')) return `${value} 数字逻辑IC`
    return `${value} 集成电路`
  }

  // 🔥 新增：推荐供应商
  private getRecommendedSupplier(type: string): string {
    const suppliers = {
      'resistor': 'Vishay/Yageo',
      'capacitor': 'Murata/Samsung',
      'led': 'Kingbright/Osram',
      'ic': 'Texas Instruments/Analog Devices',
      'transistor': 'Infineon/ON Semi',
      'diode': 'Vishay/NXP',
      'inductor': 'Wurth/TDK'
    }
    return suppliers[type] || '常见品牌'
  }

  // 🔥 新增：详细参数信息
  private getDetailedParameters(type: string, value: string): string {
    switch(type) {
      case 'resistor':
        return `阻值: ${value}, 功率: 1/4W, 精度: ±5%, 温系: 100ppm/℃`
      case 'capacitor':
        return `容值: ${value}, 电压: 50V, 介质: X7R, 精度: ±10%`
      case 'led':
        return `颜色: ${value}, If: 20mA, Vf: 2.0-2.4V, 亮度: 2000-3000mcd`
      case 'ic':
        return this.getICParameters(value)
      case 'transistor':
        return `型号: ${value}, Vds: 60V, Id: 30A, Rds(on): <100mΩ`
      case 'diode':
        return `型号: ${value}, Vf: 0.7V, If: 1A, 反向电压: 50V`
      case 'inductor':
        return `电感值: ${value}, 额定电流: 1A, DCR: <1Ω`
      default:
        return `规格: ${value}`
    }
  }

  // IC参数详情
  private getICParameters(value: string): string {
    if (value.includes('LM7805')) return '输入: 7-35V, 输出: 5V/1A, 精度: ±4%'
    if (value.includes('NE555')) return '工作电压: 4.5-15V, 输出电流: 200mA, 频率: 1Hz-500kHz'
    if (value.includes('OPA')) return '增益带宽: 10MHz, 输入偏置: <1mV, 供电: ±15V'
    if (value.includes('LM358')) return '双运放, 增益带宽: 1MHz, 供电: 3-32V'
    return `${value} 集成电路参数`
  }

  // 获取默认型号
  private getDefaultModel(type: string): string {
    const models = {
      'resistor': '1/4W 5%',
      'capacitor': 'X7R',
      'led': 'Standard LED',
      'ic': 'DIP Package',
      'transistor': 'TO-220',
      'diode': '1N4148',
      'inductor': 'Wirewound'
    }
    return models[type] || 'Standard'
  }

  // 获取元件描述
  private getComponentDescription(type: string, value: string): string {
    const descriptions = {
      'resistor': `${value} 精密电阻`,
      'capacitor': `${value} 陶瓷电容`,
      'led': `${value} LED指示灯`,
      'ic': `${value} 集成电路`,
      'transistor': `${value} 功率晶体管`,
      'diode': `${value} 整流二极管`,
      'inductor': `${value} 电感`
    }
    return descriptions[type] || `${value} 电子元件`
  }
}
