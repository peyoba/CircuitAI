import axios, { AxiosResponse } from 'axios'
import { message } from 'antd'

// 动态获取API基础URL
const getApiBaseUrl = () => {
  // 生产环境直接使用Workers API地址
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return 'https://circuitai-api.peyoba660703.workers.dev/api';
  }

  // 本地开发环境
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3003/api';
  }
  
  // 默认回退到生产环境地址
  return 'https://circuitai-api.peyoba660703.workers.dev/api';
}

// 创建axios实例
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000, // 增加到2分钟，AI回复需要更多时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加请求时间戳
    config.metadata = { startTime: new Date().getTime() }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // 计算请求耗时
    const endTime = new Date().getTime()
    const duration = endTime - (response.config.metadata?.startTime || endTime)
    console.log(`API请求耗时: ${duration}ms`)
    
    return response
  },
  (error) => {
    // 统一错误处理
    const { response } = error
    
    if (response) {
      const { status, data } = response
      
      switch (status) {
        case 400:
          message.error(data.error || '请求参数错误')
          break
        case 401:
          message.error('未授权访问，请先登录')
          break
        case 403:
          message.error('访问被拒绝')
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 429:
          message.error('请求过于频繁，请稍后再试')
          break
        case 500:
          message.error(data.error || '服务器内部错误')
          break
        default:
          message.error(data.error || `请求失败 (${status})`)
      }
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时，请检查网络连接')
    } else {
      message.error('网络错误，请检查网络连接')
    }
    
    return Promise.reject(error)
  }
)

// API接口定义
export interface ChatRequest {
  message: string
  conversationId?: string
  provider?: string
  apiConfig?: {
    provider: string
    apiKey: string
    apiUrl: string
    model: string
    maxTokens?: number
    temperature?: number
    requestFormat?: 'openai' | 'claude' | 'custom'
    responseFormat?: 'openai' | 'claude' | 'custom'
    customHeaders?: Record<string, string>
  }
}

export interface ChatResponse {
  success: boolean
  data: {
    response: string
    conversationId: string
    provider: string
    circuit_data?: {
      ascii?: string
      description?: string
      components?: Array<{
        name: string
        type: string
        value?: string
      }>
    }
    bom_data?: {
      items?: Array<{
        component: string
        quantity: number
        price?: number
      }>
      totalCost?: number
    }
  }
}

export interface ApiTestRequest {
  provider: string
  apiKey: string
  apiUrl: string
  model: string
  maxTokens?: number
  temperature?: number
  requestFormat?: 'openai' | 'claude' | 'custom'
  responseFormat?: 'openai' | 'claude' | 'custom'
  customHeaders?: Record<string, string>
}

export interface ApiTestResponse {
  success: boolean
  message?: string
  error?: string
}

export interface ComponentInfo {
  id: string
  name: string
  type: string
  category: string
  properties?: Record<string, string | number | boolean>
}

export interface AIModel {
  id: string
  name: string
  status: 'available' | 'unavailable' | 'limited'
  description?: string
}

// AI对话API
export const aiAPI = {
  // 发送聊天消息
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/ai/chat', {
      message: request.message,
      conversation_id: request.conversationId,
      provider: request.provider || 'openai',
      apiConfig: request.apiConfig
    })
    return response.data
  },

  // 获取可用模型列表
  async getModels(): Promise<AIModel[]> {
    const response = await api.get<{ available_models: AIModel[] }>('/ai/models')
    return response.data.available_models
  },

  // 测试API配置
  async testApiConfig(config: ApiTestRequest): Promise<ApiTestResponse> {
    try {
      const response = await api.post<ApiTestResponse>('/ai/test-config', config)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: '测试失败，请检查配置'
      }
    }
  },

  // 获取支持的提供商
  async getProviders(): Promise<Array<{ name: string, key: string, available: boolean }>> {
    try {
      const response = await api.get<{ success: boolean, data: Array<{ name: string, key: string, available: boolean }> }>('/ai/providers')
      return response.data.data || []
    } catch (error) {
      return []
    }
  },

  // 验证API密钥 (保持向后兼容)
  async validateApiKey(model: string, apiKey: string): Promise<boolean> {
    try {
      const response = await this.testApiConfig({
        provider: model,
        apiKey,
        apiUrl: '',
        model: 'test'
      })
      return response.success
    } catch (error) {
      return false
    }
  }
}

// 电路设计API
export const circuitAPI = {
  // 生成电路
  async generateCircuit(requirements: {
    description: string
    type?: string
    voltage?: number
    current?: number
  }): Promise<{
    ascii: string
    description: string
    components: Array<{ name: string, type: string, value?: string }>
  }> {
    const response = await api.post('/circuit/generate', requirements)
    return response.data
  },

  // 获取元件库
  async getComponents(): Promise<ComponentInfo[]> {
    const response = await api.get<{ components: ComponentInfo[] }>('/circuit/components')
    return response.data.components
  },

  // 验证电路
  async validateCircuit(circuitData: {
    ascii: string
    components: Array<{ name: string, type: string }>
  }): Promise<{ isValid: boolean, issues: string[] }> {
    const response = await api.post('/circuit/validate', circuitData)
    return response.data
  },

  // 优化电路
  async optimizeCircuit(circuitData: {
    ascii: string
    components: Array<{ name: string, type: string }>
  }, aspect: string): Promise<{ suggestions: string[] }> {
    const response = await api.post('/circuit/optimize', { circuitData, aspect })
    return response.data
  }
}

// 用户API
export const userAPI = {
  // 获取用户资料
  async getProfile(): Promise<{
    id: string
    name: string
    email: string
    preferences: Record<string, unknown>
  }> {
    const response = await api.get('/user/profile')
    return response.data
  },

  // 更新用户资料
  async updateProfile(profile: {
    name?: string
    email?: string
    preferences?: Record<string, unknown>
  }): Promise<{
    id: string
    name: string
    email: string
    preferences: Record<string, unknown>
  }> {
    const response = await api.put('/user/profile', profile)
    return response.data
  },

  // 获取用户设计历史
  async getDesignHistory(): Promise<Array<{
    id: string
    name: string
    description?: string
    createdAt: string
    updatedAt: string
  }>> {
    const response = await api.get('/user/designs')
    return response.data
  },

  // 保存设计
  async saveDesign(design: {
    name: string
    description?: string
    circuitData: Record<string, unknown>
    bomData?: Record<string, unknown>
  }): Promise<{
    id: string
    name: string
    createdAt: string
  }> {
    const response = await api.post('/user/designs', design)
    return response.data
  }
}

// 工具函数
export const utils = {
  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/health')
      return response.status === 200 && response.data.status === 'ok'
    } catch (error) {
      return false
    }
  },

  // 获取API统计信息
  async getStats(): Promise<{
    totalRequests: number
    totalTokens: number
    avgResponseTime: number
  }> {
    const response = await api.get('/stats')
    return response.data
  }
}

// 导出默认实例
export default api

// 为兼容性导出类型
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number
    }
  }
}