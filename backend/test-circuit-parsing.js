// 测试电路解析功能
import { CircuitGenerator } from './dist/services/circuit/CircuitGenerator.js'

const generator = new CircuitGenerator()

// 测试新格式的ASCII电路图
const testASCII1 = `VCC ----[R1(220Ω)]----[LED1]----[GND]`
const testASCII2 = `
      [R2(10kΩ)]
        +---+
        |   |
INPUT --[R1(1kΩ)]--+--[U1(LM741)]--+-- OUTPUT
                   |              |
                 [GND]         [C1(100nF)]
`

console.log('测试LED电路解析:')
console.log('ASCII:', testASCII1)
const components1 = generator.extractComponents(testASCII1)
console.log('提取的组件:', JSON.stringify(components1, null, 2))

console.log('\n测试运放电路解析:')
console.log('ASCII:', testASCII2)
const components2 = generator.extractComponents(testASCII2)
console.log('提取的组件:', JSON.stringify(components2, null, 2))

console.log('\n测试属性解析:')
const content = `
- 工作电压: 5V
- 工作电流: 20mA
- 功耗: 0.1W
- LED正向电压: 2.0V
- R1: 限流电阻 220Ω ±5% 1/4W
- LED1: 红色发光二极管 Φ5mm
- 电源: +5V直流电源
`
const properties = generator.extractProperties(content)
console.log('提取的属性:', JSON.stringify(properties, null, 2))