import { describe, it, expect, beforeEach } from 'vitest'
import { CircuitGenerator, ComponentInfo } from './CircuitGenerator'

describe('CircuitGenerator', () => {
  let generator: CircuitGenerator

  beforeEach(() => {
    generator = new CircuitGenerator()
  })

  describe('extractComponents', () => {
    it('should extract resistor components from ASCII diagram', () => {
      const asciiDiagram = '[R1] ---- [R2] ---- [LED1] ---- GND'
      
      const components = generator.extractComponents(asciiDiagram)
      
      expect(components.length).toBeGreaterThan(0)
      // 检查是否包含R1组件
      const r1Component = components.find(c => c.reference === 'R1')
      expect(r1Component).toBeDefined()
      expect(r1Component?.type).toBe('resistor')
    })

    it('should extract LED components from ASCII diagram', () => {
      const asciiDiagram = 'VCC ---- [R1] ---- [LED1] ---- GND'
      
      const components = generator.extractComponents(asciiDiagram)
      
      const ledComponent = components.find(c => c.type === 'led')
      expect(ledComponent).toBeDefined()
      expect(ledComponent?.reference).toBe('LED1')
    })

    it('should handle empty ASCII diagram', () => {
      const components = generator.extractComponents('')
      
      expect(components).toEqual([])
    })
  })

  describe('extractProperties', () => {
    it('should extract voltage properties from text', () => {
      const text = '工作电压: 5V, 输出电压: 3.3V'
      
      const properties = generator.extractProperties(text)
      
      expect(properties.length).toBeGreaterThan(0)
      const voltageProps = properties.filter(p => p.unit === 'V')
      expect(voltageProps.length).toBe(2)
    })

    it('should extract current properties from text', () => {
      const text = '工作电流: 20mA, 最大电流: 1A'
      
      const properties = generator.extractProperties(text)
      
      const currentProps = properties.filter(p => p.unit && (p.unit.includes('mA') || p.unit.includes('A')))
      expect(currentProps.length).toBeGreaterThanOrEqual(1) // 至少应该提取到一个电流参数
    })

    it('should handle empty text', () => {
      const properties = generator.extractProperties('')
      
      expect(properties).toEqual([])
    })
  })

  describe('validateCircuit', () => {
    it('should validate circuit with LED and resistor', () => {
      const components: ComponentInfo[] = [
        { id: '1', name: 'LED', type: 'led', reference: 'LED1' },
        { id: '2', name: '电阻', type: 'resistor', reference: 'R1' },
        { id: '3', name: '电源', type: 'power', reference: 'VCC' }
      ]
      
      const result = generator.validateCircuit(components)
      
      expect(result.isValid).toBe(true)
      expect(result.issues.length).toBe(0)
    })

    it('should detect missing power supply', () => {
      const components: ComponentInfo[] = [
        { id: '1', name: 'LED', type: 'led', reference: 'LED1' },
        { id: '2', name: '电阻', type: 'resistor', reference: 'R1' }
      ]
      
      const result = generator.validateCircuit(components)
      
      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('电路缺少电源')
    })
  })

  describe('optimizeCircuit', () => {
    it('should provide suggestions for circuit optimization', () => {
      const components: ComponentInfo[] = [
        { id: '1', name: 'LM358', type: 'ic', reference: 'U1' },
        { id: '2', name: '电解电容', type: 'capacitor', reference: 'C1' }
      ]
      
      const result = generator.optimizeCircuit(components)
      
      expect(result.suggestions.length).toBeGreaterThan(0)
      // 棅查是否包含电解电容相关的建议
      const hasCapacitorSuggestion = result.suggestions.some(s => s.includes('电解') || s.includes('钽'))
      expect(hasCapacitorSuggestion).toBe(true)
    })
  })
})