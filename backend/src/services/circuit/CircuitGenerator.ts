import logger from '../../config/logger.js'

export interface ComponentInfo {
  id: string
  name: string
  type: string
  value?: string
  reference: string
  pins?: string[]
}

export interface CircuitProperty {
  name: string
  value: string | number
  unit?: string
  description?: string
}

export interface Connection {
  id: string
  from: {
    component: string
    pin?: string
  }
  to: {
    component: string
    pin?: string
  }
  label?: string
  description?: string
}

export class CircuitGenerator {
  extractComponents(asciiDiagram: string): ComponentInfo[] {
    const components: ComponentInfo[] = []
    
    try {
      // 提取电阻 - 支持带参数格式 [R1(220Ω)]
      const resistorMatches = asciiDiagram.match(/\[R\d+(?:\([^)]*\))?\]/g)
      if (resistorMatches) {
        resistorMatches.forEach(match => {
          const fullMatch = match.replace(/[[\]]/g, '')
          const reference = fullMatch.split('(')[0] // 提取R1部分
          const value = fullMatch.includes('(') ? fullMatch.split('(')[1].replace(')', '') : undefined
          components.push({
            id: `comp_${reference.toLowerCase()}`,
            name: '电阻',
            type: 'resistor',
            reference: reference,
            value: value
          })
        })
      }

      // 提取电容 - 支持带参数格式 [C1(100nF)]
      const capacitorMatches = asciiDiagram.match(/\[C\d+(?:\([^)]*\))?\]/g)
      if (capacitorMatches) {
        capacitorMatches.forEach(match => {
          const fullMatch = match.replace(/[[\]]/g, '')
          const reference = fullMatch.split('(')[0]
          const value = fullMatch.includes('(') ? fullMatch.split('(')[1].replace(')', '') : undefined
          components.push({
            id: `comp_${reference.toLowerCase()}`,
            name: '电容',
            type: 'capacitor',
            reference: reference,
            value: value
          })
        })
      }

      // 提取LED - 支持带参数格式 [LED1(红色)]
      const ledMatches = asciiDiagram.match(/\[LED\d*(?:\([^)]*\))?\]/g)
      if (ledMatches) {
        ledMatches.forEach(match => {
          const fullMatch = match.replace(/[[\]]/g, '')
          const reference = fullMatch.split('(')[0]
          const value = fullMatch.includes('(') ? fullMatch.split('(')[1].replace(')', '') : undefined
          components.push({
            id: `comp_${reference.toLowerCase()}`,
            name: 'LED发光二极管',
            type: 'led',
            reference: reference,
            value: value
          })
        })
      }

      // 提取二极管
      const diodeMatches = asciiDiagram.match(/\[D\d+\]/g)
      if (diodeMatches) {
        diodeMatches.forEach(match => {
          const reference = match.replace(/[[\]]/g, '')
          components.push({
            id: `comp_${reference.toLowerCase()}`,
            name: '二极管',
            type: 'diode',
            reference: reference
          })
        })
      }

      // 提取IC/运放 - 支持带参数格式 [U1(LM741)]
      const icMatches = asciiDiagram.match(/\[U\d+(?:\([^)]*\))?\]|\[运放\]|\[LM\d+\]/g)
      if (icMatches) {
        icMatches.forEach(match => {
          const fullMatch = match.replace(/[[\]]/g, '')
          let reference, value
          
          if (fullMatch.includes('(')) {
            reference = fullMatch.split('(')[0]
            value = fullMatch.split('(')[1].replace(')', '')
          } else {
            reference = fullMatch
            value = undefined
          }
          
          components.push({
            id: `comp_${reference.toLowerCase()}`,
            name: '集成电路',
            type: 'ic',
            reference: reference.startsWith('U') ? reference : `U${components.length + 1}`,
            value: value
          })
        })
      }

      // 提取变压器
      const transformerMatches = asciiDiagram.match(/\[变压器\]|\[T\d+\]/g)
      if (transformerMatches) {
        transformerMatches.forEach(match => {
          const reference = match.replace(/[[\]]/g, '')
          components.push({
            id: `comp_transformer`,
            name: '变压器',
            type: 'transformer',
            reference: reference.startsWith('T') ? reference : 'T1'
          })
        })
      }

      logger.debug(`Extracted ${components.length} components from ASCII diagram`)
      return components

    } catch (error) {
      logger.error('Error extracting components:', error)
      return []
    }
  }

  extractConnections(asciiDiagram: string): Connection[] {
    const connections: Connection[] = []
    
    try {
      // 清理ASCII图，移除多余空格和换行
      const cleanDiagram = asciiDiagram.replace(/\s+/g, ' ').trim()
      
      // 解析连线格式: VCC ----[R1]----[LED1]----[GND]
      const linePattern = /([A-Za-z0-9_]+|\[[^\]]+\])\s*[-]+\s*([A-Za-z0-9_]+|\[[^\]]+\])/g
      let match
      let connectionId = 1
      
      while ((match = linePattern.exec(cleanDiagram)) !== null) {
        const fromNode = match[1]
        const toNode = match[2]
        
        // 清理节点名称，移除方括号
        const cleanFrom = fromNode.replace(/[[\]]/g, '').split('(')[0]
        const cleanTo = toNode.replace(/[[\]]/g, '').split('(')[0]
        
        connections.push({
          id: `conn_${connectionId++}`,
          from: {
            component: cleanFrom,
            pin: this.inferPin(cleanFrom, 'output')
          },
          to: {
            component: cleanTo,
            pin: this.inferPin(cleanTo, 'input')
          },
          label: `${cleanFrom} → ${cleanTo}`,
          description: `从${cleanFrom}到${cleanTo}的连接`
        })
      }
      
      // 处理分支连接（如VCC分支到多个组件）
      const branchPattern = /([A-Za-z0-9_]+|\[[^\]]+\])\s*[-]*\s*\|/g
      while ((match = branchPattern.exec(cleanDiagram)) !== null) {
        const sourceNode = match[1].replace(/[[\]]/g, '').split('(')[0]
        
        // 查找该分支后的连接
        const remainingDiagram = cleanDiagram.substring(match.index! + match[0].length)
        const branchConnections = remainingDiagram.match(/\[[^\]]+\]/g) || []
        
        branchConnections.forEach(target => {
          const cleanTarget = target.replace(/[[\]]/g, '').split('(')[0]
          
          connections.push({
            id: `conn_${connectionId++}`,
            from: {
              component: sourceNode,
              pin: this.inferPin(sourceNode, 'output')
            },
            to: {
              component: cleanTarget,
              pin: this.inferPin(cleanTarget, 'input')
            },
            label: `${sourceNode} → ${cleanTarget}`,
            description: `从${sourceNode}到${cleanTarget}的分支连接`
          })
        })
      }
      
      // 去重连接
      const uniqueConnections = connections.filter((conn, index) => 
        connections.findIndex(c => 
          c.from.component === conn.from.component && 
          c.to.component === conn.to.component
        ) === index
      )
      
      logger.debug(`Extracted ${uniqueConnections.length} connections from ASCII diagram`)
      return uniqueConnections
      
    } catch (error) {
      logger.error('Error extracting connections:', error)
      return []
    }
  }
  
  private inferPin(componentRef: string, direction: 'input' | 'output'): string {
    // 根据组件类型推断引脚
    if (componentRef.startsWith('R')) {
      return direction === 'input' ? 'Pin1' : 'Pin2'
    } else if (componentRef.startsWith('C')) {
      return direction === 'input' ? '+' : '-'
    } else if (componentRef.startsWith('LED')) {
      return direction === 'input' ? 'A' : 'K' // 阳极/阴极
    } else if (componentRef.startsWith('U')) {
      return direction === 'input' ? 'IN' : 'OUT'
    } else if (componentRef === 'VCC' || componentRef === 'VDD') {
      return '+'
    } else if (componentRef === 'GND') {
      return '-'
    }
    return direction === 'input' ? 'IN' : 'OUT'
  }

  extractProperties(content: string): CircuitProperty[] {
    const properties: CircuitProperty[] = []
    
    try {
      // 提取电压信息
      const voltageMatches = content.match(/(\d+(?:\.\d+)?)\s*V/g)
      if (voltageMatches) {
        voltageMatches.forEach((match, index) => {
          const value = match.replace('V', '').trim()
          properties.push({
            name: `电压${index + 1}`,
            value: parseFloat(value),
            unit: 'V',
            description: '工作电压'
          })
        })
      }

      // 提取电流信息
      const currentMatches = content.match(/(\d+(?:\.\d+)?)\s*(mA|A)/g)
      if (currentMatches) {
        currentMatches.forEach((match, index) => {
          const [value, unit] = match.split(/\s*/)
          properties.push({
            name: `电流${index + 1}`,
            value: parseFloat(value),
            unit: unit,
            description: '工作电流'
          })
        })
      }

      // 提取电阻值
      const resistanceMatches = content.match(/(\d+(?:\.\d+)?)\s*(Ω|kΩ|MΩ|ohm)/g)
      if (resistanceMatches) {
        resistanceMatches.forEach((match, index) => {
          const [value, unit] = match.split(/\s*/)
          properties.push({
            name: `电阻${index + 1}`,
            value: parseFloat(value),
            unit: unit.replace('ohm', 'Ω'),
            description: '电阻值'
          })
        })
      }

      // 提取电容值
      const capacitanceMatches = content.match(/(\d+(?:\.\d+)?)\s*(μF|nF|pF|mF)/g)
      if (capacitanceMatches) {
        capacitanceMatches.forEach((match, index) => {
          const [value, unit] = match.split(/\s*/)
          properties.push({
            name: `电容${index + 1}`,
            value: parseFloat(value),
            unit: unit,
            description: '电容值'
          })
        })
      }

      // 提取频率信息
      const frequencyMatches = content.match(/(\d+(?:\.\d+)?)\s*(Hz|kHz|MHz)/g)
      if (frequencyMatches) {
        frequencyMatches.forEach((match, index) => {
          const [value, unit] = match.split(/\s*/)
          properties.push({
            name: `频率${index + 1}`,
            value: parseFloat(value),
            unit: unit,
            description: '工作频率'
          })
        })
      }

      // 提取功率信息
      const powerMatches = content.match(/(\d+(?:\.\d+)?)\s*(W|mW|kW)/g)
      if (powerMatches) {
        powerMatches.forEach((match, index) => {
          const [value, unit] = match.split(/\s*/)
          properties.push({
            name: `功率${index + 1}`,
            value: parseFloat(value),
            unit: unit,
            description: '功率'
          })
        })
      }

      logger.debug(`Extracted ${properties.length} properties from content`)
      return properties

    } catch (error) {
      logger.error('Error extracting properties:', error)
      return []
    }
  }

  generateASCIICircuit(components: ComponentInfo[], _connections: Connection[]): string {
    // 根据实际检测到的元件生成更合适的ASCII电路图
    
    if (components.length === 0) {
      return `
电路原理图：

VCC ----+----[R1]----+----[LED1]---- GND
        |            |
       [C1]         [R2]
        |            |
       GND          [LED2]---- GND

元件说明：
- R1: 限流电阻
- LED1: 发光二极管
- C1: 滤波电容
- R2: 限流电阻
- LED2: 发光二极管
`.trim()
    }

    let diagram = `
电路原理图：

`

    // 根据元件类型生成不同的电路拓扑
    const hasLED = components.some(comp => comp.type === 'led')
    const hasResistor = components.some(comp => comp.type === 'resistor')
    const hasCapacitor = components.some(comp => comp.type === 'capacitor')
    const hasIC = components.some(comp => comp.type === 'ic')

    if (hasIC && hasCapacitor && hasResistor) {
      // 运放电路
      diagram += `
VCC ----+----[R1]----+----[U1]----+---- Vout
        |            |     |       |
       [C1]          +----[-]     [R3]
        |            |     |       |
       GND          Vin   [+]     GND
        |                  |
        +------------------+
`
    } else if (hasLED && hasResistor) {
      // LED驱动电路
      const leds = components.filter(comp => comp.type === 'led')
      const resistors = components.filter(comp => comp.type === 'resistor')
      
      if (leds.length > 1) {
        diagram += `
VCC ----+----[${resistors[0]?.reference || 'R1'}]----+----[${leds[0]?.reference || 'LED1'}]---- GND
        |                  |
        +----[${resistors[1]?.reference || 'R2'}]----+----[${leds[1]?.reference || 'LED2'}]---- GND
`
      } else {
        diagram += `
VCC ----[${resistors[0]?.reference || 'R1'}]----[${leds[0]?.reference || 'LED1'}]---- GND
`
      }
    } else if (hasCapacitor && hasResistor) {
      // RC滤波电路
      diagram += `
Vin ----[${components.find(c => c.type === 'resistor')?.reference || 'R1'}]----+---- Vout
                                    |
                                   [${components.find(c => c.type === 'capacitor')?.reference || 'C1'}]
                                    |
                                   GND
`
    } else {
      // 通用电路
      diagram += `VCC ----+`
      
      components.forEach((comp, index) => {
        if (index === 0) {
          diagram += `----[${comp.reference}]`
        } else {
          diagram += `----[${comp.reference}]`
        }
      })
      
      diagram += `---- GND\n`
      
      if (hasCapacitor) {
        const cap = components.find(c => c.type === 'capacitor')
        diagram += `        |\n       [${cap?.reference}]\n        |\n       GND\n`
      }
    }

    diagram += `\n元件说明：\n`
    
    components.forEach(comp => {
      let description = `- ${comp.reference}: ${comp.name}`
      if (comp.value) {
        description += ` (${comp.value})`
      }
      diagram += description + '\n'
    })

    return diagram.trim()
  }

  validateCircuit(components: ComponentInfo[]): { isValid: boolean, issues: string[] } {
    const issues: string[] = []
    
    // 检查是否有电源
    const hasPower = components.some(comp => 
      comp.type === 'power' || comp.reference.includes('VCC') || comp.reference.includes('VDD')
    )
    
    if (!hasPower) {
      issues.push('电路缺少电源')
    }

    // 检查LED是否有限流电阻
    const hasLED = components.some(comp => comp.type === 'led')
    const hasResistor = components.some(comp => comp.type === 'resistor')
    
    if (hasLED && !hasResistor) {
      issues.push('LED电路缺少限流电阻，可能导致LED烧毁')
    }

    // 检查运放是否有电源
    const hasOpAmp = components.some(comp => 
      comp.type === 'ic' && (comp.reference.includes('LM') || comp.name.includes('运放'))
    )
    
    if (hasOpAmp && !hasPower) {
      issues.push('运放电路需要电源供电')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  optimizeCircuit(components: ComponentInfo[]): {
    suggestions: string[]
    optimizedComponents?: ComponentInfo[]
  } {
    const suggestions: string[] = []

    // 成本优化建议
    if (components.length > 10) {
      suggestions.push('考虑使用集成度更高的器件来减少元件数量')
    }

    // 可靠性建议
    const hasElectrolyticCap = components.some(comp => 
      comp.type === 'capacitor' && comp.name?.includes('电解')
    )
    
    if (hasElectrolyticCap) {
      suggestions.push('在关键位置使用钽电容替代电解电容以提高可靠性')
    }

    // 性能优化建议
    const hasGenericOpAmp = components.some(comp => 
      comp.reference?.includes('LM358')
    )
    
    if (hasGenericOpAmp) {
      suggestions.push('对于高精度应用，建议使用低噪声、低偏置的运放')
    }

    return { suggestions }
  }
}