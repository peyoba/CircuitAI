// 简化版AI服务，适配Cloudflare Workers
export class AIService {
  // 内存中的对话历史存储（适用于Cloudflare Workers）
  private static conversations: Map<string, Array<{role: string, content: string}>> = new Map()
  
  async chat(message: string, conversationId: string, provider: string, apiConfig: any) {
    // 生成或使用现有的会话ID
    if (!conversationId) {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    // 获取或创建对话历史
    if (!AIService.conversations.has(conversationId)) {
      AIService.conversations.set(conversationId, [])
    }
    const conversationHistory = AIService.conversations.get(conversationId)!
    
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
    const { apiUrl, apiKey, model } = config
    
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: message }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const responseText = data.choices[0].message.content
    
    // 提取电路数据和BOM数据
    const { circuit_data, bom_data } = this.extractDataFromResponse(responseText)
    
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'custom',
      circuit_data,
      bom_data
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
    
    // 提取电路数据和BOM数据
    const { circuit_data, bom_data } = this.extractDataFromResponse(responseText)
    
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'openai',
      circuit_data,
      bom_data
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
    const { apiKey, model = 'gemini-pro' } = config
    
    console.log('Gemini API调用:', { model, messageLength: message.length, historyLength: conversationHistory?.length || 0 })
    
    // 构建Gemini的多轮对话格式
    const contents = []
    
    // 如果是第一条消息，添加系统提示词
    if (!conversationHistory || conversationHistory.length <= 1) {
      const systemPrompt = this.buildCircuitDesignPrompt(message)
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      })
    } else {
      // 添加对话历史（最近4轮对话）
      const recentHistory = conversationHistory.slice(-8) // 4轮对话 = 8条消息
      for (let i = 0; i < recentHistory.length - 1; i++) { // 排除当前消息
        const msg = recentHistory[i]
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
      
      // 添加当前用户消息
      contents.push({
        role: 'user',
        parts: [{ text: `基于前面的对话，请回答：${message}` }]
      })
    }
    
    const requestBody = { contents }
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API错误响应:', { status: response.status, statusText: response.statusText, body: errorText })
      throw new Error(`Gemini API调用失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const responseText = data.candidates[0].content.parts[0].text
    
    // 提取电路数据和BOM数据
    const { circuit_data, bom_data } = this.extractDataFromResponse(responseText)
    
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'gemini',
      circuit_data,
      bom_data
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

  // 从AI响应中提取电路数据和BOM数据
  private extractDataFromResponse(response: string) {
    let circuit_data = null
    let bom_data = null
    
    // 提取ASCII电路图
    const codeBlockRegex = /```([\s\S]*?)```/g
    const codeBlocks = response.match(codeBlockRegex)
    
    if (codeBlocks) {
      for (const block of codeBlocks) {
        const cleanBlock = block.replace(/```/g, '').trim()
        // 简单检测是否是电路图（包含常见电路符号）
        if (this.isCircuitDiagram(cleanBlock)) {
          circuit_data = {
            ascii: cleanBlock,
            description: this.extractDescription(response),
            components: this.extractComponents(response), // 从完整响应中提取
            connections: this.extractConnections(response) // 从完整响应中提取
          }
          break
        }
      }
    }
    
    // 提取BOM数据 - 基于已提取的组件
    if (circuit_data && circuit_data.components) {
      bom_data = this.generateBOMFromComponents(circuit_data.components)
    } else if (response.includes('BOM') || response.includes('物料清单') || response.includes('元件清单')) {
      bom_data = this.extractBOMFromText(response)
    }
    
    return { circuit_data, bom_data }
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
  
  // 构建完善的电路设计提示词
  private buildCircuitDesignPrompt(userMessage: string): string {
    return `你是CircuitsAI的资深硬件电路设计总工程师，拥有20年全栈硬件设计经验，精通所有电路领域：

## 专业领域覆盖：
**模拟电路**：运放、比较器、滤波器、信号调理、精密测量
**数字电路**：逻辑设计、时序电路、状态机、总线接口
**电源电路**：线性/开关电源、DC-DC、AC-DC、电池管理、功率因数校正
**射频电路**：天线设计、匹配网络、混频器、功放、滤波器
**传感器电路**：信号放大、ADC接口、温度/压力/光学传感器
**通信电路**：UART、SPI、I2C、CAN、以太网、无线通信
**控制电路**：电机驱动、伺服控制、PID控制、保护电路
**音频电路**：前置放大、功率放大、音频处理、DAC/ADC
**高速电路**：信号完整性、电源完整性、差分信号、阻抗控制

## 工作流程：
1. **立即输出**：第一轮对话必须给出完整可行的电路方案，绝不允许只询问不输出
2. **持续迭代**：基于用户反馈无限轮优化，直到用户完全满意为止
3. **渐进完善**：每轮对话都在原方案基础上改进，而不是推倒重来

## 核心原则：
- **第一轮必出结果**：收到任何电路需求后，立即输出完整的电路方案（原理图+BOM+计算）
- **绝不空手而归**：即使信息不完整也要基于工程经验给出可用方案，同时说明假设条件
- **边输出边询问**：在给出方案的同时询问优化信息，而不是先问后做
- **无限迭代优化**：根据用户反馈持续改进，每轮都优化而不推倒重来
- **全栈工程思维**：从系统级考虑，提供实用的成熟方案

## 强制输出要求：
- **必须包含**：完整ASCII电路图、详细BOM清单、参数计算过程
- **必须说明**：工程假设条件（如电压/电流/功率等）
- **可以同时**：询问优化参数，但不能以此为理由不输出方案

## 绝对禁止：
❌ 只询问参数不给电路
❌ 以"需要更多信息"为理由拒绝设计
❌ 给出概念性描述而非具体电路

---

用户需求：${userMessage}

请按照以下严格格式输出设计结果：

## 电路设计

\`\`\`
[在这里绘制ASCII电路图，使用标准符号，标注所有元件值、引脚、关键节点]
\`\`\`

## 电路说明
**设计原理：** [详细描述电路工作原理和信号流向，说明为什么选择这种拓扑结构]
**计算方法：** [给出关键参数的计算公式和具体数值计算过程]
**元件选型：** [说明每个元件的选型依据、额定参数要求和替代方案]
**设计注意事项：** [列出PCB布线、调试方法、潜在问题和改进空间]

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
| 2    | LED  | 红色3mm    | LED1 | 1 | 0.15 | 指示灯 |

**请严格按照上述格式输出，确保每个表格都有完整的内容。每轮对话都要有实质性的电路设计内容输出！**`
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
}
