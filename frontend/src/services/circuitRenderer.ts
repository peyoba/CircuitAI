// 电路渲染服务 - 负责将电路数据转换为可视化图形

export interface Point {
  x: number
  y: number
}

export interface ComponentSymbol {
  id: string
  name: string
  type: string
  svgPath: string
  width: number
  height: number
  pins: Pin[]
  category: string
}

export interface Pin {
  id: string
  name: string
  position: Point
  direction: 'input' | 'output' | 'bidirectional'
  type: 'power' | 'signal' | 'ground'
}

export interface CircuitComponent {
  id: string
  type: string
  position: Point
  rotation: number
  properties: { [key: string]: string | number }
  symbol: ComponentSymbol
}

export interface Wire {
  id: string
  points: Point[]
  netName?: string
  color?: string
}

export interface CircuitLayout {
  components: CircuitComponent[]
  wires: Wire[]
  bounds: {
    width: number
    height: number
  }
}

export interface RenderOptions {
  gridSize: number
  showGrid: boolean
  theme: 'light' | 'dark'
  scale: number
  showLabels: boolean
  showPinNumbers: boolean
}

class CircuitRenderer {
  private symbols: Map<string, ComponentSymbol> = new Map()
  
  constructor() {
    this.initializeSymbols()
  }

  private initializeSymbols() {
    // 基础电路符号定义
    this.addSymbol({
      id: 'resistor',
      name: '电阻',
      type: 'resistor',
      category: 'passive',
      width: 60,
      height: 20,
      svgPath: `
        <rect x="10" y="5" width="40" height="10" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="0" y1="10" x2="10" y2="10" stroke="currentColor" stroke-width="2"/>
        <line x1="50" y1="10" x2="60" y2="10" stroke="currentColor" stroke-width="2"/>
      `,
      pins: [
        { id: '1', name: '1', position: { x: 0, y: 10 }, direction: 'bidirectional', type: 'signal' },
        { id: '2', name: '2', position: { x: 60, y: 10 }, direction: 'bidirectional', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'capacitor',
      name: '电容',
      type: 'capacitor',
      category: 'passive',
      width: 60,
      height: 30,
      svgPath: `
        <line x1="25" y1="5" x2="25" y2="25" stroke="currentColor" stroke-width="3"/>
        <line x1="35" y1="5" x2="35" y2="25" stroke="currentColor" stroke-width="3"/>
        <line x1="0" y1="15" x2="25" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="35" y1="15" x2="60" y2="15" stroke="currentColor" stroke-width="2"/>
      `,
      pins: [
        { id: '1', name: '+', position: { x: 0, y: 15 }, direction: 'bidirectional', type: 'signal' },
        { id: '2', name: '-', position: { x: 60, y: 15 }, direction: 'bidirectional', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'inductor',
      name: '电感',
      type: 'inductor', 
      category: 'passive',
      width: 60,
      height: 20,
      svgPath: `
        <path d="M 10 10 Q 15 0 20 10 Q 25 20 30 10 Q 35 0 40 10 Q 45 20 50 10" 
              fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="0" y1="10" x2="10" y2="10" stroke="currentColor" stroke-width="2"/>
        <line x1="50" y1="10" x2="60" y2="10" stroke="currentColor" stroke-width="2"/>
      `,
      pins: [
        { id: '1', name: '1', position: { x: 0, y: 10 }, direction: 'bidirectional', type: 'signal' },
        { id: '2', name: '2', position: { x: 60, y: 10 }, direction: 'bidirectional', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'diode',
      name: '二极管',
      type: 'diode',
      category: 'semiconductor',
      width: 60,
      height: 30,
      svgPath: `
        <polygon points="30,5 45,15 30,25" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="45" y1="5" x2="45" y2="25" stroke="currentColor" stroke-width="3"/>
        <line x1="0" y1="15" x2="30" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="45" y1="15" x2="60" y2="15" stroke="currentColor" stroke-width="2"/>
      `,
      pins: [
        { id: 'A', name: 'A', position: { x: 0, y: 15 }, direction: 'input', type: 'signal' },
        { id: 'K', name: 'K', position: { x: 60, y: 15 }, direction: 'output', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'led',
      name: 'LED',
      type: 'led',
      category: 'semiconductor',
      width: 60,
      height: 40,
      svgPath: `
        <polygon points="30,10 45,20 30,30" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="45" y1="10" x2="45" y2="30" stroke="currentColor" stroke-width="3"/>
        <line x1="0" y1="20" x2="30" y2="20" stroke="currentColor" stroke-width="2"/>
        <line x1="45" y1="20" x2="60" y2="20" stroke="currentColor" stroke-width="2"/>
        <!-- 发光箭头 -->
        <path d="M 48 8 L 52 4 M 48 8 L 44 8 M 48 8 L 48 4" 
              stroke="currentColor" stroke-width="1" fill="none"/>
        <path d="M 52 12 L 56 8 M 52 12 L 48 12 M 52 12 L 52 8" 
              stroke="currentColor" stroke-width="1" fill="none"/>
      `,
      pins: [
        { id: 'A', name: 'A', position: { x: 0, y: 20 }, direction: 'input', type: 'signal' },
        { id: 'K', name: 'K', position: { x: 60, y: 20 }, direction: 'output', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'npn_transistor',
      name: 'NPN晶体管',
      type: 'transistor',
      category: 'semiconductor',
      width: 60,
      height: 60,
      svgPath: `
        <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="20" y1="30" x2="40" y2="30" stroke="currentColor" stroke-width="3"/>
        <line x1="35" y1="20" x2="35" y2="40" stroke="currentColor" stroke-width="2"/>
        <line x1="0" y1="30" x2="20" y2="30" stroke="currentColor" stroke-width="2"/>
        <line x1="35" y1="20" x2="55" y2="5" stroke="currentColor" stroke-width="2"/>
        <line x1="35" y1="40" x2="55" y2="55" stroke="currentColor" stroke-width="2"/>
        <line x1="55" y1="5" x2="60" y2="0" stroke="currentColor" stroke-width="2"/>
        <line x1="55" y1="55" x2="60" y2="60" stroke="currentColor" stroke-width="2"/>
        <!-- 发射极箭头 -->
        <polygon points="50,50 55,45 55,55" fill="currentColor"/>
      `,
      pins: [
        { id: 'B', name: 'B', position: { x: 0, y: 30 }, direction: 'input', type: 'signal' },
        { id: 'C', name: 'C', position: { x: 60, y: 0 }, direction: 'output', type: 'signal' },
        { id: 'E', name: 'E', position: { x: 60, y: 60 }, direction: 'output', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'opamp',
      name: '运算放大器',
      type: 'opamp',
      category: 'analog_ic',
      width: 80,
      height: 60,
      svgPath: `
        <polygon points="10,10 70,30 10,50" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="0" y1="20" x2="10" y2="20" stroke="currentColor" stroke-width="2"/>
        <line x1="0" y1="40" x2="10" y2="40" stroke="currentColor" stroke-width="2"/>
        <line x1="70" y1="30" x2="80" y2="30" stroke="currentColor" stroke-width="2"/>
        <text x="15" y="25" font-family="Arial" font-size="12" fill="currentColor">+</text>
        <text x="15" y="45" font-family="Arial" font-size="12" fill="currentColor">-</text>
      `,
      pins: [
        { id: 'IN+', name: '+', position: { x: 0, y: 20 }, direction: 'input', type: 'signal' },
        { id: 'IN-', name: '-', position: { x: 0, y: 40 }, direction: 'input', type: 'signal' },
        { id: 'OUT', name: 'OUT', position: { x: 80, y: 30 }, direction: 'output', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'ground',
      name: '地',
      type: 'ground',
      category: 'power',
      width: 30,
      height: 30,
      svgPath: `
        <line x1="15" y1="0" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="5" y1="15" x2="25" y2="15" stroke="currentColor" stroke-width="3"/>
        <line x1="8" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="2"/>
        <line x1="11" y1="25" x2="19" y2="25" stroke="currentColor" stroke-width="2"/>
      `,
      pins: [
        { id: 'GND', name: 'GND', position: { x: 15, y: 0 }, direction: 'input', type: 'ground' }
      ]
    })

    this.addSymbol({
      id: 'vcc',
      name: '电源',
      type: 'power',
      category: 'power',
      width: 30,
      height: 30,
      svgPath: `
        <line x1="15" y1="15" x2="15" y2="30" stroke="currentColor" stroke-width="2"/>
        <line x1="5" y1="15" x2="25" y2="15" stroke="currentColor" stroke-width="3"/>
        <line x1="10" y1="10" x2="20" y2="10" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="5" x2="18" y2="5" stroke="currentColor" stroke-width="2"/>
      `,
      pins: [
        { id: 'VCC', name: 'VCC', position: { x: 15, y: 30 }, direction: 'output', type: 'power' }
      ]
    })

    // 添加更多常用电路符号
    this.addSymbol({
      id: 'voltage_source',
      name: '电压源',
      type: 'voltage_source',
      category: 'power',
      width: 60,
      height: 60,
      svgPath: `
        <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="0" y1="30" x2="5" y2="30" stroke="currentColor" stroke-width="2"/>
        <line x1="55" y1="30" x2="60" y2="30" stroke="currentColor" stroke-width="2"/>
        <line x1="20" y1="30" x2="40" y2="30" stroke="currentColor" stroke-width="2"/>
        <line x1="30" y1="20" x2="30" y2="25" stroke="currentColor" stroke-width="2"/>
        <text x="18" y="25" font-family="Arial" font-size="16" fill="currentColor">+</text>
        <text x="35" y="40" font-family="Arial" font-size="16" fill="currentColor">-</text>
      `,
      pins: [
        { id: '+', name: '+', position: { x: 0, y: 30 }, direction: 'output', type: 'power' },
        { id: '-', name: '-', position: { x: 60, y: 30 }, direction: 'input', type: 'power' }
      ]
    })

    this.addSymbol({
      id: 'switch',
      name: '开关',
      type: 'switch',
      category: 'passive',
      width: 60,
      height: 30,
      svgPath: `
        <line x1="0" y1="15" x2="20" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="40" y1="15" x2="60" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="20" y1="15" x2="35" y2="5" stroke="currentColor" stroke-width="2"/>
        <circle cx="20" cy="15" r="2" fill="currentColor"/>
        <circle cx="40" cy="15" r="2" fill="currentColor"/>
      `,
      pins: [
        { id: '1', name: '1', position: { x: 0, y: 15 }, direction: 'bidirectional', type: 'signal' },
        { id: '2', name: '2', position: { x: 60, y: 15 }, direction: 'bidirectional', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'fuse',
      name: '保险丝',
      type: 'fuse',
      category: 'passive',
      width: 60,
      height: 20,
      svgPath: `
        <rect x="15" y="5" width="30" height="10" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="0" y1="10" x2="15" y2="10" stroke="currentColor" stroke-width="2"/>
        <line x1="45" y1="10" x2="60" y2="10" stroke="currentColor" stroke-width="2"/>
        <line x1="20" y1="10" x2="40" y2="10" stroke="currentColor" stroke-width="3"/>
      `,
      pins: [
        { id: '1', name: '1', position: { x: 0, y: 10 }, direction: 'bidirectional', type: 'signal' },
        { id: '2', name: '2', position: { x: 60, y: 10 }, direction: 'bidirectional', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'crystal',
      name: '晶振',
      type: 'crystal',
      category: 'passive',
      width: 60,
      height: 40,
      svgPath: `
        <rect x="20" y="10" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="15" y1="8" x2="15" y2="32" stroke="currentColor" stroke-width="3"/>
        <line x1="45" y1="8" x2="45" y2="32" stroke="currentColor" stroke-width="3"/>
        <line x1="0" y1="20" x2="15" y2="20" stroke="currentColor" stroke-width="2"/>
        <line x1="45" y1="20" x2="60" y2="20" stroke="currentColor" stroke-width="2"/>
      `,
      pins: [
        { id: '1', name: '1', position: { x: 0, y: 20 }, direction: 'bidirectional', type: 'signal' },
        { id: '2', name: '2', position: { x: 60, y: 20 }, direction: 'bidirectional', type: 'signal' }
      ]
    })

    this.addSymbol({
      id: 'mosfet_n',
      name: 'N-MOSFET',
      type: 'mosfet',
      category: 'semiconductor',
      width: 80,
      height: 80,
      svgPath: `
        <line x1="30" y1="10" x2="30" y2="70" stroke="currentColor" stroke-width="3"/>
        <line x1="35" y1="15" x2="35" y2="25" stroke="currentColor" stroke-width="2"/>
        <line x1="35" y1="35" x2="35" y2="45" stroke="currentColor" stroke-width="2"/>
        <line x1="35" y1="55" x2="35" y2="65" stroke="currentColor" stroke-width="2"/>
        <line x1="0" y1="40" x2="30" y2="40" stroke="currentColor" stroke-width="2"/>
        <line x1="35" y1="20" x2="60" y2="5" stroke="currentColor" stroke-width="2"/>
        <line x1="35" y1="60" x2="60" y2="75" stroke="currentColor" stroke-width="2"/>
        <line x1="60" y1="5" x2="65" y2="0" stroke="currentColor" stroke-width="2"/>
        <line x1="60" y1="75" x2="65" y2="80" stroke="currentColor" stroke-width="2"/>
        <!-- 箭头指向源极 -->
        <polygon points="40,58 45,53 45,63" fill="currentColor"/>
      `,
      pins: [
        { id: 'G', name: 'G', position: { x: 0, y: 40 }, direction: 'input', type: 'signal' },
        { id: 'D', name: 'D', position: { x: 65, y: 0 }, direction: 'output', type: 'signal' },
        { id: 'S', name: 'S', position: { x: 65, y: 80 }, direction: 'output', type: 'signal' }
      ]
    })
  }

  addSymbol(symbol: ComponentSymbol) {
    this.symbols.set(symbol.id, symbol)
  }

  getSymbol(symbolId: string): ComponentSymbol | undefined {
    return this.symbols.get(symbolId)
  }

  getAllSymbols(): ComponentSymbol[] {
    return Array.from(this.symbols.values())
  }

  getSymbolsByCategory(category: string): ComponentSymbol[] {
    return Array.from(this.symbols.values()).filter(symbol => symbol.category === category)
  }

  // 将ASCII电路数据解析为组件和连接
  parseASCIICircuit(asciiDiagram?: string): CircuitLayout {
    if (!asciiDiagram) {
      // 返回示例电路
      return this.getExampleCircuit()
    }

    const components: CircuitComponent[] = []
    const wires: Wire[] = []
    const lines = asciiDiagram.split('\n')
    
    let wireIndex = 0

    // 解析组件
    lines.forEach((line, lineIndex) => {
      // 查找方括号内的组件标识
      const componentMatches = line.match(/\[([^\]]+)\]/g)
      if (componentMatches) {
        componentMatches.forEach((match, matchIndex) => {
          const componentName = match.replace(/[[\]]/g, '')
          const componentType = this.inferComponentType(componentName)
          const symbol = this.getSymbol(componentType) || this.getSymbol('resistor')!
          
          // 计算组件位置 (基于ASCII图中的位置)
          const charIndex = line.indexOf(match)
          const x = 50 + charIndex * 8 + matchIndex * 120
          const y = 50 + lineIndex * 30
          
          components.push({
            id: componentName,
            type: componentType,
            position: { x, y },
            rotation: 0,
            properties: { 
              reference: componentName,
              value: this.extractComponentValue(componentName, asciiDiagram)
            },
            symbol
          })
        })
      }
    })

    // 解析连接线 (简单的线条识别)
    lines.forEach((line, lineIndex) => {
      const wireMatches = line.match(/[-+|]{3,}/g)
      if (wireMatches) {
        wireMatches.forEach(() => {
          const startX = 50
          const endX = line.length * 8
          const y = 50 + lineIndex * 30
          
          wires.push({
            id: `wire${wireIndex++}`,
            points: [
              { x: startX, y },
              { x: endX, y }
            ],
            color: '#22c55e'
          })
        })
      }
    })

    // 智能连接相邻组件
    this.connectAdjacentComponents(components, wires)

    return {
      components,
      wires,
      bounds: {
        width: Math.max(600, Math.max(...components.map(c => c.position.x)) + 200),
        height: Math.max(400, Math.max(...components.map(c => c.position.y)) + 200)
      }
    }
  }

  private getExampleCircuit(): CircuitLayout {
    return {
      components: [
        {
          id: 'VCC',
          type: 'vcc',
          position: { x: 100, y: 50 },
          rotation: 0,
          properties: { value: '+5V' },
          symbol: this.getSymbol('vcc')!
        },
        {
          id: 'R1',
          type: 'resistor', 
          position: { x: 100, y: 120 },
          rotation: 90,
          properties: { value: '220Ω' },
          symbol: this.getSymbol('resistor')!
        },
        {
          id: 'LED1',
          type: 'led',
          position: { x: 100, y: 220 },
          rotation: 90,
          properties: { color: 'red' },
          symbol: this.getSymbol('led')!
        },
        {
          id: 'GND',
          type: 'ground',
          position: { x: 100, y: 300 },
          rotation: 0,
          properties: {},
          symbol: this.getSymbol('ground')!
        }
      ],
      wires: [
        {
          id: 'wire1',
          points: [
            { x: 115, y: 80 },
            { x: 115, y: 120 }
          ],
          color: '#22c55e'
        },
        {
          id: 'wire2', 
          points: [
            { x: 115, y: 180 },
            { x: 115, y: 220 }
          ],
          color: '#22c55e'
        },
        {
          id: 'wire3',
          points: [
            { x: 115, y: 280 },
            { x: 115, y: 300 }
          ],
          color: '#22c55e'
        }
      ],
      bounds: {
        width: 300,
        height: 400
      }
    }
  }

  private inferComponentType(componentName: string): string {
    const name = componentName.toLowerCase()
    
    if (name.match(/^r\d+$/) || name.includes('电阻')) return 'resistor'
    if (name.match(/^c\d+$/) || name.includes('电容')) return 'capacitor' 
    if (name.match(/^l\d+$/) || name.includes('电感')) return 'inductor'
    if (name.match(/^d\d+$/) || name.includes('二极管')) return 'diode'
    if (name.includes('led') || name.includes('发光')) return 'led'
    if (name.match(/^q\d+$/) || name.includes('晶体管')) return 'npn_transistor'
    if (name.includes('运放') || name.includes('opamp')) return 'opamp'
    if (name.includes('开关') || name.includes('switch')) return 'switch'
    if (name.includes('vcc') || name.includes('电源')) return 'vcc'
    if (name.includes('gnd') || name.includes('地')) return 'ground'
    if (name.includes('晶振') || name.includes('crystal')) return 'crystal'
    
    return 'resistor'
  }

  private extractComponentValue(componentName: string, asciiDiagram: string): string {
    // 在ASCII图中查找组件值的简单算法
    const lines = asciiDiagram.split('\n')
    
    // 查找包含组件名称和可能值的行
    for (const line of lines) {
      if (line.includes(componentName)) {
        // 查找常见的值模式
        const valuePatterns = [
          /(\d+(?:\.\d+)?)\s*(Ω|ohm|欧)/i,    // 电阻值
          /(\d+(?:\.\d+)?)\s*(μF|nF|pF|uF)/i, // 电容值
          /(\d+(?:\.\d+)?)\s*(mH|μH|H)/i,     // 电感值
          /(\d+(?:\.\d+)?)\s*(V|伏)/i,        // 电压值
          /(\d+(?:\.\d+)?)\s*(mA|A|安)/i      // 电流值
        ]
        
        for (const pattern of valuePatterns) {
          const match = line.match(pattern)
          if (match) {
            return match[1] + match[2]
          }
        }
        
        // 查找括号内的值
        const bracketMatch = line.match(/\(([^)]+)\)/)
        if (bracketMatch) {
          return bracketMatch[1]
        }
      }
    }
    
    return ''
  }

  private connectAdjacentComponents(components: CircuitComponent[], wires: Wire[]) {
    // 智能连接相邻的组件
    for (let i = 0; i < components.length - 1; i++) {
      const comp1 = components[i]
      const comp2 = components[i + 1]
      
      // 计算组件间距离
      const distance = Math.sqrt(
        Math.pow(comp2.position.x - comp1.position.x, 2) +
        Math.pow(comp2.position.y - comp1.position.y, 2)
      )
      
      // 如果距离合适,添加连接线
      if (distance < 150) {
        const wire: Wire = {
          id: `auto_wire_${i}`,
          points: [
            { 
              x: comp1.position.x + comp1.symbol.width / 2, 
              y: comp1.position.y + comp1.symbol.height / 2 
            },
            { 
              x: comp2.position.x + comp2.symbol.width / 2, 
              y: comp2.position.y + comp2.symbol.height / 2 
            }
          ],
          color: '#22c55e'
        }
        wires.push(wire)
      }
    }
  }

  // 渲染电路到SVG
  renderToSVG(layout: CircuitLayout, options: RenderOptions): string {
    const { bounds } = layout
    const { gridSize, showGrid, theme, scale } = options
    
    let svg = `<svg width="${bounds.width * scale}" height="${bounds.height * scale}" 
                    viewBox="0 0 ${bounds.width} ${bounds.height}" 
                    xmlns="http://www.w3.org/2000/svg" 
                    style="background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'}; color: ${theme === 'dark' ? '#ffffff' : '#000000'};">`

    // 添加网格
    if (showGrid) {
      svg += this.renderGrid(bounds, gridSize, theme)
    }

    // 渲染导线
    for (const wire of layout.wires) {
      svg += this.renderWire(wire, theme)
    }

    // 渲染组件
    for (const component of layout.components) {
      svg += this.renderComponent(component, options)
    }

    svg += '</svg>'
    return svg
  }

  private renderGrid(_bounds: { width: number; height: number }, gridSize: number, theme: string): string {
    let grid = '<defs><pattern id="grid" width="' + gridSize + '" height="' + gridSize + '" patternUnits="userSpaceOnUse">'
    grid += '<path d="M ' + gridSize + ' 0 L 0 0 0 ' + gridSize + '" fill="none" stroke="' + 
            (theme === 'dark' ? '#333' : '#ddd') + '" stroke-width="1"/></pattern></defs>'
    grid += '<rect width="100%" height="100%" fill="url(#grid)"/>'
    return grid
  }

  private renderWire(wire: Wire, theme: string): string {
    if (wire.points.length < 2) return ''
    
    let path = `<path d="M ${wire.points[0].x} ${wire.points[0].y}`
    for (let i = 1; i < wire.points.length; i++) {
      path += ` L ${wire.points[i].x} ${wire.points[i].y}`
    }
    path += `" stroke="${wire.color || (theme === 'dark' ? '#4ade80' : '#22c55e')}" stroke-width="2" fill="none"/>`
    
    return path
  }

  private renderComponent(component: CircuitComponent, options: RenderOptions): string {
    const { position, rotation, symbol, properties } = component
    const { showLabels } = options
    
    let svg = `<g transform="translate(${position.x}, ${position.y}) rotate(${rotation})">`
    svg += symbol.svgPath
    
    if (showLabels) {
      svg += `<text x="${symbol.width / 2}" y="${symbol.height + 15}" 
                    text-anchor="middle" font-family="Arial" font-size="12" fill="currentColor">
                ${component.id}
              </text>`
      
      if (properties.value) {
        svg += `<text x="${symbol.width / 2}" y="${symbol.height + 30}" 
                      text-anchor="middle" font-family="Arial" font-size="10" fill="currentColor">
                  ${properties.value}
                </text>`
      }
    }
    
    svg += '</g>'
    return svg
  }

  // 智能自动布局算法
  autoLayout(components: CircuitComponent[]): CircuitLayout {
    if (components.length === 0) {
      return {
        components: [],
        wires: [],
        bounds: { width: 400, height: 300 }
      }
    }

    // 分类组件
    const powerComponents = components.filter(c => c.symbol.category === 'power')
    const passiveComponents = components.filter(c => c.symbol.category === 'passive')
    const semiconductorComponents = components.filter(c => c.symbol.category === 'semiconductor')
    const analogComponents = components.filter(c => c.symbol.category === 'analog_ic')
    const otherComponents = components.filter(c => 
      !['power', 'passive', 'semiconductor', 'analog_ic'].includes(c.symbol.category)
    )

    const layoutComponents: CircuitComponent[] = []
    const wires: Wire[] = []
    let currentY = 80
    const leftMargin = 80
    const componentSpacing = 120
    const rowHeight = 100

    // 1. 布局电源组件 (顶部)
    if (powerComponents.length > 0) {
      let x = leftMargin
      powerComponents.forEach((comp) => {
        comp.position = { x, y: currentY }
        layoutComponents.push(comp)
        x += componentSpacing
      })
      currentY += rowHeight
    }

    // 2. 布局模拟IC (中心区域)
    if (analogComponents.length > 0) {
      let x = leftMargin + componentSpacing
      analogComponents.forEach((comp) => {
        comp.position = { x, y: currentY }
        layoutComponents.push(comp)
        x += componentSpacing * 1.5 // 给IC更多空间
      })
      currentY += rowHeight * 1.2
    }

    // 3. 布局半导体器件 (中下区域)  
    if (semiconductorComponents.length > 0) {
      let x = leftMargin
      let rowComponents = 0
      const maxPerRow = 3
      
      semiconductorComponents.forEach((comp) => {
        comp.position = { x, y: currentY }
        layoutComponents.push(comp)
        
        rowComponents++
        if (rowComponents >= maxPerRow) {
          currentY += rowHeight
          x = leftMargin
          rowComponents = 0
        } else {
          x += componentSpacing
        }
      })
      
      if (rowComponents > 0) {
        currentY += rowHeight
      }
    }

    // 4. 布局被动组件 (填充剩余空间)
    if (passiveComponents.length > 0) {
      let x = leftMargin
      let rowComponents = 0
      const maxPerRow = 4
      
      passiveComponents.forEach((comp) => {
        comp.position = { x, y: currentY }
        layoutComponents.push(comp)
        
        rowComponents++
        if (rowComponents >= maxPerRow) {
          currentY += rowHeight * 0.8 // 被动组件行高较小
          x = leftMargin
          rowComponents = 0
        } else {
          x += componentSpacing * 0.8 // 被动组件间距较小
        }
      })
      
      if (rowComponents > 0) {
        currentY += rowHeight * 0.8
      }
    }

    // 5. 布局其他组件
    if (otherComponents.length > 0) {
      let x = leftMargin
      otherComponents.forEach((comp) => {
        comp.position = { x, y: currentY }
        layoutComponents.push(comp)
        x += componentSpacing
      })
      currentY += rowHeight
    }

    // 自动连接具有电路逻辑关系的组件
    this.createSmartConnections(layoutComponents, wires)

    const maxX = Math.max(...layoutComponents.map(c => c.position.x + c.symbol.width))
    const maxY = Math.max(...layoutComponents.map(c => c.position.y + c.symbol.height))

    return {
      components: layoutComponents,
      wires,
      bounds: {
        width: Math.max(600, maxX + 100),
        height: Math.max(400, maxY + 100)
      }
    }
  }

  // 创建智能连接
  private createSmartConnections(components: CircuitComponent[], wires: Wire[]) {
    // 典型的电路连接模式
    const vccComponents = components.filter(c => c.type === 'vcc')
    const gndComponents = components.filter(c => c.type === 'ground')
    const resistors = components.filter(c => c.type === 'resistor')
    const leds = components.filter(c => c.type === 'led')
    
    // 创建电源到电阻的连接
    if (vccComponents.length > 0 && resistors.length > 0) {
      const vcc = vccComponents[0]
      const resistor = resistors[0]
      
      wires.push({
        id: 'power_to_resistor',
        points: [
          { x: vcc.position.x + vcc.symbol.width/2, y: vcc.position.y + vcc.symbol.height },
          { x: resistor.position.x + resistor.symbol.width/2, y: resistor.position.y }
        ],
        color: '#ef4444' // 红色表示电源线
      })
    }
    
    // 创建电阻到LED的连接
    if (resistors.length > 0 && leds.length > 0) {
      const resistor = resistors[0]
      const led = leds[0]
      
      wires.push({
        id: 'resistor_to_led',
        points: [
          { x: resistor.position.x + resistor.symbol.width/2, y: resistor.position.y + resistor.symbol.height },
          { x: led.position.x + led.symbol.width/2, y: led.position.y }
        ],
        color: '#22c55e' // 绿色表示信号线
      })
    }
    
    // 创建LED到地的连接
    if (leds.length > 0 && gndComponents.length > 0) {
      const led = leds[0]
      const gnd = gndComponents[0]
      
      wires.push({
        id: 'led_to_ground',
        points: [
          { x: led.position.x + led.symbol.width/2, y: led.position.y + led.symbol.height },
          { x: gnd.position.x + gnd.symbol.width/2, y: gnd.position.y }
        ],
        color: '#000000' // 黑色表示地线
      })
    }
  }

  // 导出为PNG (需要在浏览器环境中使用)
  exportToPNG(svgString: string, width: number, height: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('无法获取Canvas上下文'))
        return
      }

      canvas.width = width
      canvas.height = height

      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('PNG导出失败'))
          }
        }, 'image/png')
      }
      
      img.onerror = () => reject(new Error('SVG加载失败'))
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
    })
  }
}

export const circuitRenderer = new CircuitRenderer()
export default circuitRenderer