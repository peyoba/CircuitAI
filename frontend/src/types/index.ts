// AI 相关类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatSession {
  id: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

// API相关类型
export interface ChatRequest {
  message: string
  context?: string
  provider?: string
  apiConfig?: APIConfig
  conversationId?: string
}

export interface ChatResponse {
  success: boolean
  data?: {
    response: string
    usage?: {
      tokens: number
    }
    conversationId?: string
    circuit_data?: any
    bom_data?: any
  }
  error?: string
}

export interface APIConfig {
  provider: string
  apiKey: string
  apiUrl: string
  model: string
  maxTokens?: number
  temperature?: number
  requestFormat?: string
  responseFormat?: string
}

export interface ApiTestRequest {
  provider: string
  apiKey: string
  apiUrl: string
  model: string
  maxTokens?: number
  temperature?: number
}

export interface ApiTestResponse {
  success: boolean
  message?: string
  responseTime?: number
  error?: string
}

export interface AIModel {
  name: string
  provider: string
  description?: string
}

export interface ComponentInfo {
  name: string
  type: string
  value?: string
  description?: string
}

// API 响应类型
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 电路相关类型
export interface Component {
  id: string
  name: string
  type: ComponentType
  category: ComponentCategory
  symbol: string
  properties: ComponentProperty[]
  footprint?: string
}

export enum ComponentType {
  RESISTOR = 'resistor',
  CAPACITOR = 'capacitor',
  INDUCTOR = 'inductor',
  DIODE = 'diode',
  TRANSISTOR = 'transistor',
  IC = 'ic',
  CONNECTOR = 'connector'
}

export enum ComponentCategory {
  PASSIVE = 'passive',
  ACTIVE = 'active',
  DIGITAL = 'digital',
  ANALOG = 'analog',
  POWER = 'power',
  INTERFACE = 'interface'
}

export interface ComponentProperty {
  name: string
  value: string
  unit?: string
  tolerance?: string
}

export interface Circuit {
  id: string
  name: string
  description: string
  components: Component[]
  connections: Connection[]
  schematic?: string
  createdAt: Date
  updatedAt: Date
}

export interface Connection {
  id: string
  from: {
    componentId: string
    pin: string
  }
  to: {
    componentId: string
    pin: string
  }
  signal?: string
}

// BOM 相关类型
export interface BOMItem {
  id: string
  designator: string
  component: Component
  quantity: number
  price?: number
  supplier?: string
  partNumber?: string
  description?: string
}

export interface BOM {
  id: string
  circuitId: string
  items: BOMItem[]
  totalCost?: number
  currency?: string
  createdAt: Date
  updatedAt: Date
}

// 项目相关类型
export interface Project {
  id: string
  name: string
  description?: string
  circuits: Circuit[]
  bom?: BOM
  createdAt: Date
  updatedAt: Date
}