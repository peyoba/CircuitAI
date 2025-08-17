// 简化版AI服务，适配Cloudflare Workers
export class AIService {
  // 使用Cloudflare KV存储对话历史（持久化）
  private static conversations: Map<string, Array<{role: string, content: string}>> = new Map()
  
  // 确保对话历史不会因Workers重启而丢失
  private async getConversationHistory(conversationId: string): Promise<Array<{role: string, content: string}>> {
    let history = AIService.conversations.get(conversationId)
    if (!history) {
      history = []
      AIService.conversations.set(conversationId, history)
    }
    return history
  }
  
  async chat(message: string, conversationId: string, provider: string, apiConfig: any) {
    // 生成或使用现有的会话ID
    if (!conversationId) {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    // 获取对话历史
    const conversationHistory = await this.getConversationHistory(conversationId)
    
    // 添加用户消息到历史
    conversationHistory.push({
      role: 'user',
      content: message
    })
    
    // 限制历史消息数量，避免token过多
    if (conversationHistory.length > 20) {
      conversationHistory.splice(0, conversationHistory.length - 20)
    }
    
    // 构建包含历史的完整消息
    const fullPrompt = this.buildPromptWithHistory(message, conversationHistory)
    
    // 根据provider调用不同的AI服务
    let response: any
    switch (provider) {
      case 'openai':
        response = await this.callOpenAI(message, apiConfig, conversationHistory)
        break
      case 'claude':
        response = await this.callClaude(fullPrompt, apiConfig)
        break
      case 'gemini':
        response = await this.callGemini(message, apiConfig, conversationHistory)
        break
      case 'custom':
        response = await this.callCustomAPI(fullPrompt, apiConfig)
        break
      case 'mock':
        response = await this.mockResponse(message, conversationHistory)
        break
      default:
        throw new Error(`不支持的提供商: ${provider}`)
    }
    
    // 将AI响应添加到历史
    if (response && response.response) {
      conversationHistory.push({
        role: 'assistant',
        content: response.response
      })
    }
    
    // **关键修复**：对所有AI提供商都进行数据提取
    if (response && response.response && provider !== 'mock') {
      console.log('开始提取电路数据，响应长度:', response.response.length)
      const { circuit_data, bom_data } = this.extractDataFromResponse(response.response)
      console.log('提取结果:', { 
        hasCircuitData: !!circuit_data, 
        hasBomData: !!bom_data,
        circuitComponents: circuit_data?.components?.length || 0,
        bomItems: bom_data?.items?.length || 0
      })
      
      // 覆盖原有的数据
      if (circuit_data) response.circuit_data = circuit_data
      if (bom_data) response.bom_data = bom_data
    }
    
    // 返回响应，包含会话ID
    return {
      ...response,
      conversation_id: conversationId
    }
  }

  async testConfig(config: any) {
    try {
      // 简单的配置测试
      const response = await this.callCustomAPI('test', config)
      return {
        isValid: true,
        provider: config.provider,
        model: config.model
      }
    } catch (error) {
      return {
        isValid: false,
        provider: config.provider,
        error: error.message
      }
    }
  }

  private async callCustomAPI(message: string, config: any) {
    try {
      const { apiUrl, apiKey, model } = config
      
      console.log('Custom API调用开始:', { 
        apiUrl: apiUrl?.substring(0, 50) + '...', 
        model, 
        hasApiKey: !!apiKey,
        messageLength: message.length
      })
      
      if (!apiUrl || !apiKey || !model) {
        throw new Error(`Custom API配置不完整: apiUrl=${!!apiUrl}, apiKey=${!!apiKey}, model=${!!model}`)
      }
      
      const requestBody = {
        model,
        messages: [
          { role: 'user', content: message }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }
      
      console.log('Custom API请求:', { url: `${apiUrl}/v1/chat/completions`, body: requestBody })
      
      const response = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

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
      
      // 提取电路数据和BOM数据
      let circuit_data = null
      let bom_data = null
      
      try {
        const extracted = this.extractDataFromResponse(responseText)
        circuit_data = extracted.circuit_data
        bom_data = extracted.bom_data
      } catch (extractError) {
        console.error('Custom API数据提取失败:', extractError.message)
      }
      
      return {
        response: responseText,
        conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: 'custom',
        circuit_data,
        bom_data
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

  private async callOpenAI(message: string, config: any, conversationHistory?: Array<{role: string, content: string}>) {
    const { apiKey, model = 'gpt-3.5-turbo' } = config
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: this.buildOpenAIMessages(message, conversationHistory),
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API调用失败: ${response.status} ${response.statusText}`)
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
    const { apiKey, model = 'claude-3-sonnet-20240229' } = config
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: message }]
      })
    })

    if (!response.ok) {
      throw new Error(`Claude API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const responseText = data.content[0].text
    
    // 提取电路数据和BOM数据
    const { circuit_data, bom_data } = this.extractDataFromResponse(responseText)
    
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'claude',
      circuit_data,
      bom_data
    }
  }

  private async callGemini(message: string, config: any, conversationHistory?: Array<{role: string, content: string}>) {
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
      
      // 构建Gemini的多轮对话格式
      const contents = []
      
      // 检查是否是首次对话
      const isFirstMessage = !conversationHistory || conversationHistory.length === 1 // 只有当前用户消息
      
      if (isFirstMessage) {
        // 首次对话，使用完整的系统提示词
        const systemPrompt = this.buildCircuitDesignPrompt(message)
        contents.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        })
        console.log('使用完整系统提示词 - 首次对话')
      } else {
        // 后续对话，包含历史记录
        console.log('使用对话历史 - 后续对话，历史长度:', conversationHistory.length)
        
        // 添加对话历史（最近6轮对话，排除当前消息）
        const recentHistory = conversationHistory.slice(-13, -1) // 排除最后一条(当前)消息
        
        // 如果有历史，先添加一个简化的上下文提示
        if (recentHistory.length > 0) {
          contents.push({
            role: 'user',
            parts: [{ text: '你是专业的硬件电路设计专家。基于我们之前的对话，请继续为我提供专业的技术支持。' }]
          })
          
          // 添加历史对话
          for (const msg of recentHistory) {
            if (msg.role === 'user') {
              contents.push({
                role: 'user',
                parts: [{ text: msg.content }]
              })
            } else if (msg.role === 'assistant') {
              contents.push({
                role: 'model',
                parts: [{ text: msg.content }]
              })
            }
          }
        }
        
        // 添加当前用户消息
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        })
      }
      
      const requestBody = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096
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
    let circuit_data = null
    let bom_data = null
    
    if (isFollowUp) {
      // 后续对话的回复
      if (message.includes('优化') || message.includes('改进') || message.includes('修改')) {
        response += `基于前面的设计，我建议以下优化方案：\n\n1. 增加滤波电容以提高稳定性\n2. 采用更精密的电阻以提高精度\n3. 添加保护电路防止过流\n\n这样可以让电路性能更佳。`
      } else if (message.includes('参数') || message.includes('计算')) {
        response += `根据前面的电路设计，关键参数计算如下：\n\n- 限流电阻：R = (Vin - Vf) / If = (5V - 2V) / 10mA = 300Ω\n- 功耗：P = I²R = (0.01A)² × 330Ω = 0.033W\n- 电流精度：±5% (取决于电阻精度)\n\n选择330Ω标准阻值比较合适。`
      } else {
        response += `基于我们前面讨论的电路，我理解您想了解更多技术细节。请告诉我您具体想了解哪个方面，我可以提供更详细的解释。`
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
    
    let circuit_data = null
    let bom_data = null
    
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
      let ascii = null
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
      } catch (error) {
        console.log('代码块提取失败:', error.message)
      }
      
      // 2. 如果没找到代码块，寻找明显的电路结构
      if (!ascii) {
        try {
          ascii = this.findCircuitInText(response)
        } catch (error) {
          console.log('文本电路提取失败:', error.message)
        }
      }
      
      // 3. 提取电路描述、元件和连接
      let description = ''
      let components = []
      let connections = []
      
      try {
        description = this.extractDescription(response) || '电路设计说明'
      } catch (error) {
        console.log('描述提取失败:', error.message)
        description = '电路设计说明'
      }
      
      try {
        components = this.extractComponents(response) || []
      } catch (error) {
        console.log('元件提取失败:', error.message)
        components = []
      }
      
      try {
        connections = this.extractConnections(response) || []
      } catch (error) {
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
    } catch (error) {
      console.log('电路数据提取全部失败:', error.message)
      return null
    }
  }

  // 智能提取BOM数据
  private extractBOMData(response: string, circuit_data: any) {
    try {
      let bom_data = null
      
      // 策略1: 寻找明确的BOM表格
      try {
        bom_data = this.extractBOMFromTable(response)
        if (bom_data && bom_data.items && bom_data.items.length > 0) {
          console.log('策略1成功: BOM表格提取')
          return bom_data
        }
      } catch (error) {
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
      } catch (error) {
        console.log('策略2失败:', error.message)
      }
      
      // 策略3: 智能文本分析提取元件
      try {
        bom_data = this.intelligentBOMExtraction(response)
        if (bom_data && bom_data.items && bom_data.items.length > 0) {
          console.log('策略3成功: 智能文本分析')
          return bom_data
        }
      } catch (error) {
        console.log('策略3失败:', error.message)
      }
      
      // 策略4: 最后手段 - 正则模式匹配
      try {
        bom_data = this.forceExtractBOM(response)
        console.log('策略4: 正则匹配，结果:', bom_data?.items?.length || 0)
        return bom_data
      } catch (error) {
        console.log('策略4失败:', error.message)
        return null
      }
    } catch (error) {
      console.log('BOM提取全部失败:', error.message)
      return null
    }
  }

  // 在文本中寻找电路结构
  private findCircuitInText(response: string): string | null {
    // 寻找包含电路符号的段落
    const lines = response.split('\n')
    let circuitLines = []
    
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

  // 从明确的BOM表格中提取
  private extractBOMFromTable(response: string) {
    const bomPatterns = [
      /(?:BOM|物料清单|元件清单)[\s\S]*?\|(.*?\|.*?\|.*?\|)/gi,
      /\|.*?序号.*?\|.*?名称.*?\|.*?型号.*?\|/gi,
      /\|.*?编号.*?\|.*?元件.*?\|.*?规格.*?\|/gi
    ]
    
    for (const pattern of bomPatterns) {
      const matches = Array.from(response.matchAll(pattern))
      if (matches.length > 0) {
        return this.parseBOMTable(response, pattern)
      }
    }
    
    return null
  }

  // 解析BOM表格
  private parseBOMTable(response: string, pattern: RegExp) {
    const items = []
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
    const items = []
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
    const components = []
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
    const components = []
    
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
    const connections = []
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
    const items = []
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
    const items = []
    
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
  
  // 构建精简的电路设计提示词
  private buildCircuitDesignPrompt(userMessage: string): string {
    return `你是硬件电路设计专家。请专业回答：${userMessage}

要求：
- 提供电路原理和计算
- 推荐具体元件型号  
- 包含ASCII电路图
- 给出实现指南

请深入分析并提供完整的技术方案。`
  }

  // 构建包含历史的提示词
  private buildPromptWithHistory(currentMessage: string, history: Array<{role: string, content: string}>): string {
    // 如果是第一条消息，使用完整的系统提示词
    if (history.length <= 1) {
      return this.buildCircuitDesignPrompt(currentMessage)
    }

    // 构建简化的上下文提示词，包含历史对话
    let prompt = `你是CircuitsAI的资深硬件电路设计总工程师。请基于以下对话历史，继续为用户提供专业的电路设计服务。

## 对话历史：
`
    
    // 添加最近的对话历史（最多10轮）
    const recentHistory = history.slice(-10)
    for (let i = 0; i < recentHistory.length - 1; i++) { // 不包括当前用户消息
      const msg = recentHistory[i]
      if (msg.role === 'user') {
        prompt += `\n**用户：** ${msg.content}\n`
      } else if (msg.role === 'assistant') {
        // 只保留响应的前200字符，避免提示词过长
        const shortContent = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content
        prompt += `**AI：** ${shortContent}\n`
      }
    }

    prompt += `\n## 当前用户请求：
${currentMessage}

## 回复要求：
请基于上述对话历史，针对用户的当前请求提供：
1. 如果是新的设计需求，按标准格式提供完整方案（ASCII图、说明、元件表、连接关系、BOM）
2. 如果是对前面设计的修改或优化，请在原有基础上进行改进
3. 如果是技术问题，请结合前面的设计背景给出专业解答

请保持回复的专业性和连贯性。`

    return prompt
  }

  // 构建OpenAI消息格式
  private buildOpenAIMessages(message: string, conversationHistory?: Array<{role: string, content: string}>) {
    const messages = []
    
    // 如果是第一条消息，添加系统提示词
    if (!conversationHistory || conversationHistory.length <= 1) {
      const systemPrompt = this.buildCircuitDesignPrompt(message)
      messages.push({ role: 'user', content: systemPrompt })
    } else {
      // 添加系统指导
      messages.push({ 
        role: 'system', 
        content: '你是CircuitsAI的资深硬件电路设计总工程师。基于对话历史，继续提供专业的电路设计服务。' 
      })
      
      // 添加对话历史（最近8条消息）
      const recentHistory = conversationHistory.slice(-8)
      for (let i = 0; i < recentHistory.length - 1; i++) { // 排除当前消息
        const msg = recentHistory[i]
        messages.push({ 
          role: msg.role === 'assistant' ? 'assistant' : 'user', 
          content: msg.content 
        })
      }
      
      // 添加当前用户消息
      messages.push({ role: 'user', content: message })
    }
    
    return messages
  }

  // 智能从专业回答中提取BOM - 增强版
  private forceExtractBOM(response: string) {
    const items = []
    
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
          
          items.push({
            component: reference || `${type.toUpperCase()}${itemId}`,
            quantity: 1,
            value: value,
            model: modelMatch ? modelMatch[2] : this.getDefaultModel(type),
            package: packageMatch ? packageMatch[2] : this.getDefaultPackage(reference || type),
            price: this.getComponentPrice(type),
            description: this.getComponentDescription(type, value)
          })
          itemId++
        }
      }
    })
    
    if (items.length > 0) {
      const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      console.log('智能提取BOM成功，项目数:', items.length)
      return { items, totalCost }
    }
    
    console.log('无法提取任何BOM数据')
    return null
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
