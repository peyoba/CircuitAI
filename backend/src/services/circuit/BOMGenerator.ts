import logger from '../../config/logger.js'

export interface BOMItem {
  id: string
  reference: string[]
  component: string
  value: string
  package?: string
  quantity: number
  manufacturer?: string
  partNumber?: string
  supplier?: string
  price?: number
  description?: string
}

export class BOMGenerator {
  private componentDatabase = {
    resistor: {
      manufacturer: '风华高科',
      supplier: '立创商城',
      basePrice: 0.02,
      packages: ['0603', '0805', '1206', 'TH']
    },
    capacitor: {
      manufacturer: '村田',
      supplier: '立创商城', 
      basePrice: 0.05,
      packages: ['0603', '0805', '1206', 'TH']
    },
    led: {
      manufacturer: 'EVERLIGHT',
      supplier: '立创商城',
      basePrice: 0.15,
      packages: ['3mm', '5mm', '0805', '1206']
    },
    diode: {
      manufacturer: 'ON Semi',
      supplier: '立创商城',
      basePrice: 0.08,
      packages: ['SOD-123', 'DO-214', 'DO-41']
    },
    ic: {
      manufacturer: 'TI',
      supplier: '立创商城',
      basePrice: 2.50,
      packages: ['DIP-8', 'SOIC-8', 'SOT-23']
    },
    transformer: {
      manufacturer: '中天',
      supplier: '立创商城',
      basePrice: 15.00,
      packages: ['TH']
    }
  }

  generateFromContent(content: string): BOMItem[] {
    const bomItems: BOMItem[] = []
    
    try {
      // 解析元件清单部分
      const listSection = this.extractComponentListSection(content)
      if (listSection) {
        const items = this.parseComponentList(listSection)
        bomItems.push(...items)
      }

      // 从ASCII电路图中提取元件
      const asciiSection = this.extractASCIISection(content)
      if (asciiSection) {
        const items = this.parseASCIIComponents(asciiSection)
        bomItems.push(...items)
      }

      // 合并重复元件
      const mergedItems = this.mergeComponents(bomItems)
      
      // 添加价格和供应商信息
      const enrichedItems = this.enrichComponentInfo(mergedItems)

      logger.info(`Generated BOM with ${enrichedItems.length} unique components`)
      return enrichedItems

    } catch (error) {
      logger.error('Error generating BOM:', error)
      return []
    }
  }

  private extractComponentListSection(content: string): string | null {
    const patterns = [
      /## 元件清单[\s\S]*?(?=##|$)/,
      /元件清单[：:]([\s\S]*?)(?=\n\n|\n##|$)/,
      /BOM[：:]?([\s\S]*?)(?=\n\n|\n##|$)/
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match) {
        return match[0]
      }
    }

    return null
  }

  private extractASCIISection(content: string): string | null {
    const codeBlockMatch = content.match(/```([\s\S]*?)```/)
    return codeBlockMatch ? codeBlockMatch[1] : null
  }

  private parseComponentList(listContent: string): BOMItem[] {
    const items: BOMItem[] = []
    const lines = listContent.split('\n')

    lines.forEach(line => {
      line = line.trim()
      if (!line || line.startsWith('#')) return

      // 匹配格式: "1. R1, R2: 220Ω电阻，1/4W，碳膜电阻"
      const componentMatch = line.match(/^(\d+\.?\s*)?([^:：]+)[：:]\s*(.+)/)
      if (componentMatch) {
        const [, , referencePart, descriptionPart] = componentMatch
        
        // 提取元件标号
        const references = referencePart.split(/[,，]/).map(ref => ref.trim())
        
        // 解析描述
        const { component, value, specs } = this.parseComponentDescription(descriptionPart)
        
        items.push({
          id: `bom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          reference: references,
          component: component,
          value: value,
          quantity: references.length,
          description: specs,
          package: this.inferPackage(component, specs)
        })
      }
    })

    return items
  }

  private parseASCIIComponents(asciiContent: string): BOMItem[] {
    const items: BOMItem[] = []
    const componentMap = new Map<string, string[]>()

    // 提取所有元件标号
    const componentMatches = asciiContent.match(/\[([RCLUDTled]+\d*)\]/g)
    if (componentMatches) {
      componentMatches.forEach(match => {
        const reference = match.replace(/[[\]]/g, '')
        const type = this.getComponentType(reference)
        
        if (!componentMap.has(type)) {
          componentMap.set(type, [])
        }
        componentMap.get(type)!.push(reference)
      })
    }

    // 为每种类型创建BOM项目
    componentMap.forEach((references, type) => {
      const componentInfo = this.getDefaultComponentInfo(type)
      
      items.push({
        id: `bom_${type}_${Date.now()}`,
        reference: references,
        component: componentInfo.name,
        value: componentInfo.value,
        quantity: references.length,
        description: componentInfo.description,
        package: componentInfo.package
      })
    })

    return items
  }

  private parseComponentDescription(description: string): {
    component: string
    value: string
    specs: string
  } {
    let component = ''
    let value = ''
    const specs = description

    // 检测元件类型
    if (description.includes('电阻')) {
      component = '电阻'
      const valueMatch = description.match(/(\d+(?:\.\d+)?)\s*(Ω|kΩ|MΩ|ohm)/i)
      if (valueMatch) {
        value = valueMatch[0]
      }
    } else if (description.includes('电容')) {
      component = '电容'
      const valueMatch = description.match(/(\d+(?:\.\d+)?)\s*(μF|nF|pF|mF)/i)
      if (valueMatch) {
        value = valueMatch[0]
      }
    } else if (description.includes('LED') || description.includes('发光二极管')) {
      component = 'LED发光二极管'
      if (description.includes('红色')) value = '红色'
      else if (description.includes('绿色')) value = '绿色'
      else if (description.includes('蓝色')) value = '蓝色'
      else value = '标准'
    } else if (description.includes('二极管')) {
      component = '二极管'
      const modelMatch = description.match(/(1N\d+)/i)
      if (modelMatch) {
        value = modelMatch[0]
      }
    } else if (description.includes('稳压器') || description.includes('LM')) {
      component = '稳压器'
      const modelMatch = description.match(/(LM\d+)/i)
      if (modelMatch) {
        value = modelMatch[0]
      }
    } else if (description.includes('变压器')) {
      component = '变压器'
      const voltageMatch = description.match(/(\d+V).*?(\d+V)/i)
      if (voltageMatch) {
        value = `${voltageMatch[1]}/${voltageMatch[2]}`
      }
    }

    return { component, value, specs }
  }

  private getComponentType(reference: string): string {
    const firstChar = reference.charAt(0).toUpperCase()
    switch (firstChar) {
      case 'R': return 'resistor'
      case 'C': return 'capacitor'
      case 'L': return 'inductor'
      case 'U': return 'ic'
      case 'D': return 'diode'
      case 'T': return 'transformer'
      default:
        if (reference.toLowerCase().includes('led')) return 'led'
        return 'unknown'
    }
  }

  private getDefaultComponentInfo(type: string): {
    name: string
    value: string
    description: string
    package: string
  } {
    const defaults = {
      resistor: {
        name: '电阻',
        value: '10kΩ',
        description: '1/4W碳膜电阻，±5%',
        package: '0805'
      },
      capacitor: {
        name: '电容',
        value: '100nF',
        description: '50V陶瓷电容，X7R',
        package: '0805'
      },
      led: {
        name: 'LED发光二极管',
        value: '红色',
        description: '5mm，正向电压2V，工作电流20mA',
        package: '5mm'
      },
      diode: {
        name: '二极管',
        value: '1N4007',
        description: '1A 1000V整流二极管',
        package: 'DO-41'
      },
      ic: {
        name: '集成电路',
        value: 'LM358',
        description: '双运算放大器',
        package: 'DIP-8'
      },
      transformer: {
        name: '变压器',
        value: '220V/12V',
        description: '2A电源变压器',
        package: 'TH'
      }
    }

    return defaults[type as keyof typeof defaults] || {
      name: '未知元件',
      value: '-',
      description: '待确定规格',
      package: 'TH'
    }
  }

  private mergeComponents(items: BOMItem[]): BOMItem[] {
    const merged = new Map<string, BOMItem>()

    items.forEach(item => {
      const key = `${item.component}_${item.value}_${item.package}`
      
      if (merged.has(key)) {
        const existing = merged.get(key)!
        existing.reference = [...existing.reference, ...item.reference]
        existing.quantity += item.quantity
      } else {
        merged.set(key, { ...item })
      }
    })

    return Array.from(merged.values())
  }

  private enrichComponentInfo(items: BOMItem[]): BOMItem[] {
    return items.map(item => {
      const type = this.getComponentTypeFromName(item.component)
      const dbInfo = this.componentDatabase[type as keyof typeof this.componentDatabase]

      if (dbInfo) {
        return {
          ...item,
          manufacturer: item.manufacturer || dbInfo.manufacturer,
          supplier: item.supplier || dbInfo.supplier,
          price: item.price || dbInfo.basePrice,
          partNumber: item.partNumber || this.generatePartNumber(item, type)
        }
      }

      return item
    })
  }

  private getComponentTypeFromName(componentName: string): string {
    if (componentName.includes('电阻')) return 'resistor'
    if (componentName.includes('电容')) return 'capacitor'
    if (componentName.includes('LED') || componentName.includes('发光二极管')) return 'led'
    if (componentName.includes('二极管')) return 'diode'
    if (componentName.includes('集成电路') || componentName.includes('稳压器')) return 'ic'
    if (componentName.includes('变压器')) return 'transformer'
    return 'unknown'
  }

  private generatePartNumber(item: BOMItem, type: string): string {
    // 简单的型号生成逻辑
    switch (type) {
      case 'resistor':
        return `R${item.package}_${item.value.replace(/[Ω\s]/g, '')}`
      case 'capacitor':
        return `C${item.package}_${item.value.replace(/[F\s]/g, '')}`
      case 'led':
        return `LED_${item.package}_${item.value}`
      case 'diode':
        return item.value || 'D_GENERIC'
      case 'ic':
        return item.value || 'IC_GENERIC'
      case 'transformer':
        return `T_${item.value?.replace(/[V/\s]/g, '_') || 'GENERIC'}`
      default:
        return 'PART_GENERIC'
    }
  }

  private inferPackage(component: string, specs: string): string {
    // 从规格中推断封装
    if (specs.includes('贴片') || specs.includes('SMD')) {
      if (specs.includes('0603')) return '0603'
      if (specs.includes('0805')) return '0805'
      if (specs.includes('1206')) return '1206'
      return '0805' // 默认贴片封装
    }
    
    if (specs.includes('插件') || specs.includes('DIP')) {
      return 'TH'
    }

    if (component.includes('LED')) {
      if (specs.includes('3mm')) return '3mm'
      if (specs.includes('5mm')) return '5mm'
      return '5mm' // 默认LED封装
    }

    return 'TH' // 默认插件封装
  }

  exportToCSV(items: BOMItem[]): string {
    const headers = [
      '序号', '标号', '元件名称', '参数值', '封装', '数量', 
      '制造商', '型号', '供应商', '单价', '小计', '描述'
    ]

    const rows = items.map((item, index) => [
      index + 1,
      item.reference.join(', '),
      item.component,
      item.value,
      item.package || '',
      item.quantity,
      item.manufacturer || '',
      item.partNumber || '',
      item.supplier || '',
      item.price || 0,
      (item.price || 0) * item.quantity,
      item.description || ''
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }

  calculateTotalCost(items: BOMItem[]): number {
    return items.reduce((total, item) => {
      return total + (item.price || 0) * item.quantity
    }, 0)
  }

  validateBOM(items: BOMItem[]): { isValid: boolean, issues: string[] } {
    const issues: string[] = []

    // 检查必要字段
    items.forEach((item, index) => {
      if (!item.component) {
        issues.push(`第${index + 1}行缺少元件名称`)
      }
      if (!item.reference || item.reference.length === 0) {
        issues.push(`第${index + 1}行缺少元件标号`)
      }
      if (item.quantity <= 0) {
        issues.push(`第${index + 1}行数量无效`)
      }
    })

    // 检查重复标号
    const allReferences = items.flatMap(item => item.reference)
    const duplicates = allReferences.filter((ref, index) => 
      allReferences.indexOf(ref) !== index
    )
    
    if (duplicates.length > 0) {
      issues.push(`存在重复的元件标号: ${duplicates.join(', ')}`)
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}