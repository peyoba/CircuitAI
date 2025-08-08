// API 响应类型
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

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
  MECHANICAL = 'mechanical'
}

export interface ComponentProperty {
  name: string
  value: string | number
  unit?: string
  tolerance?: string
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

export interface ComponentPin {
  componentId: string
  pinNumber: string | number
  pinName?: string
}

export interface Circuit {
  id: string
  name: string
  description?: string
  components: Component[]
  connections: Connection[]
  properties: CircuitProperty[]
  createdAt: Date
  updatedAt: Date
}

export interface CircuitProperty {
  name: string
  value: string | number
  unit?: string
}

// BOM (Bill of Materials) 类型
export interface BOMItem {
  id: string
  component: Component
  quantity: number
  reference: string[]
  value?: string
  package?: string
  manufacturer?: string
  partNumber?: string
  supplier?: string
  price?: number
}

export interface BOM {
  id: string
  circuitId: string
  items: BOMItem[]
  totalCost?: number
  createdAt: Date
  updatedAt: Date
}

// 用户相关类型
export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  role: UserRole
  preferences: UserPreferences
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  defaultAIModel: string
  notifications: NotificationSettings
}

export interface NotificationSettings {
  email: boolean
  browser: boolean
  newFeatures: boolean
  updates: boolean
}