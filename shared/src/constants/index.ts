// API 端点常量
export const API_ENDPOINTS = {
  AI: {
    CHAT: '/api/ai/chat',
    MODELS: '/api/ai/models'
  },
  CIRCUIT: {
    GENERATE: '/api/circuit/generate',
    COMPONENTS: '/api/circuit/components'
  },
  USER: {
    PROFILE: '/api/user/profile'
  }
} as const

// AI 模型常量
export const AI_MODELS = {
  OPENAI: 'openai',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  DEEPSEEK: 'deepseek',
  DOUBAO: 'doubao',
  PERPLEXITY: 'perplexity'
} as const

// 电路设计阶段
export const DESIGN_PHASES = {
  REQUIREMENT: 'requirement',
  CONCEPT: 'concept',
  DETAILED: 'detailed',
  VALIDATION: 'validation'
} as const

// 元件类别颜色映射
export const COMPONENT_COLORS = {
  [ComponentType.RESISTOR]: '#8B4513',
  [ComponentType.CAPACITOR]: '#4169E1',
  [ComponentType.INDUCTOR]: '#228B22',
  [ComponentType.DIODE]: '#FF4500',
  [ComponentType.TRANSISTOR]: '#800080',
  [ComponentType.IC]: '#000080',
  [ComponentType.CONNECTOR]: '#696969'
} as const

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接错误，请检查网络设置',
  AI_SERVICE_ERROR: 'AI服务暂时不可用，请稍后再试',
  INVALID_INPUT: '输入参数无效，请检查输入内容',
  UNAUTHORIZED: '未授权访问，请先登录',
  SERVER_ERROR: '服务器内部错误，请联系技术支持'
} as const

// 成功消息
export const SUCCESS_MESSAGES = {
  CIRCUIT_GENERATED: '电路方案生成成功',
  BOM_EXPORTED: 'BOM表格导出成功',
  DESIGN_SAVED: '设计方案保存成功'
} as const

import { ComponentType } from '../types/index.js'