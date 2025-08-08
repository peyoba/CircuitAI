import { BaseAPIAdapter, APIMessage, APIResponse, APIConfig } from '../BaseAPIAdapter.js'

/**
 * Mock适配器 - 用于测试和演示，不需要真实的API连接
 */
export class MockAdapter extends BaseAPIAdapter {
  constructor(config: APIConfig) {
    super({
      ...config,
      model: config.model || 'mock-model'
    })
  }

  async chat(messages: APIMessage[], _options?: any): Promise<string> {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const lastMessage = messages[messages.length - 1]
    
    // 根据消息内容生成不同的模拟响应
    const content = lastMessage.content.toLowerCase()
    
    // 检测是否是电路设计相关的请求
    if (this.isCircuitDesignRequest(content)) {
      return this.generateCircuitResponse(content, lastMessage.content)
    } else if (content.includes('test') || content.includes('测试')) {
      return 'Mock API 连接测试成功！这是一个模拟的响应。'
    } else {
      return `Mock API 收到消息: "${lastMessage.content}"\n\n这是一个模拟的AI响应，用于测试系统功能。在实际部署时，请配置真实的AI服务提供商。`
    }
  }

  async validateApiKey(): Promise<boolean> {
    // 模拟验证延迟
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Mock适配器总是验证成功
    return true
  }

  formatMessages(messages: APIMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }

  parseResponse(response: any): APIResponse {
    return {
      content: response,
      usage: {
        promptTokens: 10,
        completionTokens: 50,
        totalTokens: 60
      }
    }
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    }
  }

  private isCircuitDesignRequest(content: string): boolean {
    const circuitKeywords = [
      '电路', 'circuit', '设计', 'design', 
      '元件', 'component', '电阻', 'resistor',
      '电容', 'capacitor', '电感', 'inductor',
      '电源', 'power', '供电', 'supply',
      '放大', 'amplifier', '滤波', 'filter',
      '转换', 'converter', '稳压', 'regulator',
      'led', '二极管', 'diode', '晶体管', 'transistor',
      '运放', 'opamp', 'op-amp', '比较器', 'comparator',
      '传感器', 'sensor', '模拟', 'analog',
      '数字', 'digital', '微控制器', 'mcu', 'microcontroller',
      '驱动', 'driver', '控制', 'control',
      '音频', 'audio', '射频', 'rf', '通信', 'communication'
    ]
    
    return circuitKeywords.some(keyword => content.includes(keyword))
  }

  private generateCircuitResponse(content: string, userContent: string): string {
    if (content.includes('led') || content.includes('指示') || content.includes('发光')) {
      return this.generateLEDCircuitResponse(userContent)
    } else if (content.includes('运放') || content.includes('放大') || content.includes('opamp')) {
      return this.generateOpAmpCircuitResponse(userContent)
    } else if (content.includes('电源') || content.includes('稳压') || content.includes('power')) {
      return this.generatePowerSupplyResponse(userContent)
    } else {
      return this.generateBasicCircuitResponse(userContent)
    }
  }

  private generateLEDCircuitResponse(userContent: string): string {
    return `# LED指示电路设计方案

## 需求分析
基于您的描述："${userContent}"，我为您设计一个基础的LED指示电路。

## 电路原理图 (ASCII)

\`\`\`
VCC ----[R1(220Ω)]----[LED1]----[GND]
 |
+5V
\`\`\`

## 电路说明
这是一个基本的LED指示电路，适用于5V电源系统。

### 关键参数
- 工作电压: 5V
- 工作电流: 20mA  
- 功耗: 0.1W
- LED正向电压: 2.0V

### 元件清单 (BOM)
- R1: 限流电阻 220Ω ±5% 1/4W
- LED1: 红色发光二极管 Φ5mm
- 电源: +5V直流电源

## 工作原理
通过限流电阻R1控制流过LED的电流，防止LED过流损坏。当VCC接入5V电源时，LED发光。`
  }

  private generateOpAmpCircuitResponse(userContent: string): string {
    return `# 运算放大器电路设计方案

## 需求分析
基于您的描述："${userContent}"，我为您设计一个运放放大电路。

## 电路原理图 (ASCII)

\`\`\`
      [R2(10kΩ)]
        +---+
        |   |
INPUT --[R1(1kΩ)]--+--[U1(LM741)]--+-- OUTPUT
                   |              |
                 [GND]         [C1(100nF)]
                                   |
                                [GND]
\`\`\`

## 电路说明
这是一个同相放大器电路，放大倍数约为11倍。

### 关键参数
- 增益: 11倍 (20.8dB)
- 带宽: 100kHz
- 输入阻抗: >1MΩ
- 电源: ±12V

### 元件清单 (BOM)
- U1: 运算放大器 LM741
- R1: 输入电阻 1kΩ ±1%
- R2: 反馈电阻 10kΩ ±1%  
- C1: 去耦电容 100nF`
  }

  private generatePowerSupplyResponse(userContent: string): string {
    return `# 线性电源电路设计方案

## 需求分析
基于您的描述："${userContent}"，我为您设计一个线性稳压电源。

## 电路原理图 (ASCII)

\`\`\`
AC INPUT --[T1]--[D1]--[C1(1000μF)]--[U1(LM7805)]--+-- +5V OUTPUT
         变压器 |     |             |             |
              [D2]   |             |          [C2(100μF)]
               |     |             |             |
              [D3]   |           [GND]         [GND]
               |     |
              [D4]---+
\`\`\`

## 电路说明
这是一个基于LM7805的线性稳压电源，输出稳定的+5V电压。

### 关键参数
- 输出电压: +5V ±2%
- 最大输出电流: 1A
- 纹波: <50mV
- 效率: ~60%

### 元件清单 (BOM)
- T1: 电源变压器 220V/9V 10VA
- D1-D4: 整流二极管 1N4007
- C1: 滤波电容 1000μF/25V
- U1: 稳压器 LM7805
- C2: 输出电容 100μF/16V`
  }

  private generateBasicCircuitResponse(userContent: string): string {
    return `# 基础电路设计方案

## 需求分析
基于您的描述："${userContent}"，我为您提供一个通用的电路框架。

## 电路原理图 (ASCII)

\`\`\`
VCC ----[R1(1kΩ)]----+----[Q1(2N2222)]----+---- OUTPUT
 |                   |                     |
+5V                [R2(10kΩ)]           [R3(470Ω)]
 |                   |                     |
[GND]              INPUT                 [GND]
\`\`\`

## 电路说明
这是一个基本的晶体管开关电路，可用于信号放大或开关控制。

### 关键参数
- 工作电压: 5V
- 切换频率: 100kHz
- 输出电流: 100mA
- 输入阻抗: 10kΩ

### 元件清单 (BOM)
- Q1: NPN晶体管 2N2222
- R1: 集电极电阻 1kΩ
- R2: 基极电阻 10kΩ  
- R3: 负载电阻 470Ω`
  }
}