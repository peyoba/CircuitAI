// 前端默认API配置
// 前端只保存显示信息，实际配置由后端处理

export interface DefaultAPIConfig {
  provider: string
  apiKey: string
  apiUrl: string
  model: string
  maxTokens?: number
  temperature?: number
  displayName: string
  description: string
  isDefault?: boolean
  requestFormat?: 'openai' | 'claude' | 'custom'
  responseFormat?: 'openai' | 'claude' | 'custom'
  customHeaders?: Record<string, string>
}

// 前端显示的默认AI配置（不包含真实API密钥）
export const DEFAULT_API_CONFIG: DefaultAPIConfig = {
  provider: 'default', // 特殊标识，后端会识别并使用内置配置
  apiKey: '', // 前端不保存实际密钥
  apiUrl: '', // 前端不保存实际URL
  model: '智能AI助手',
  maxTokens: 4000,
  temperature: 0.7,
  displayName: '智能AI助手',
  description: '系统内置AI，开箱即用',
  isDefault: true
}

// 检查是否有用户自定义的API配置
export const hasUserAPIConfig = (): boolean => {
  try {
    const userConfig = localStorage.getItem('circuitsai_api_config')
    if (!userConfig) return false
    
    const config = JSON.parse(userConfig)
    // 如果用户配置的是默认配置，认为没有用户配置
    return config.provider !== 'default' && !!config.apiKey
  } catch {
    return false
  }
}

// 获取当前激活的API配置
export const getActiveAPIConfig = (): DefaultAPIConfig => {
  try {
    const userConfig = localStorage.getItem('circuitsai_api_config')
    if (userConfig) {
      const config = JSON.parse(userConfig)
      // 如果用户选择的是默认配置，返回默认配置
      if (config.provider === 'default' || !config.apiKey) {
        return DEFAULT_API_CONFIG
      }
      return config
    }
  } catch (error) {
    console.warn('Failed to load user API config, using default:', error)
  }
  
  return DEFAULT_API_CONFIG
}

// 获取用于发送到后端的API配置
export const getActualAPIConfig = (config: DefaultAPIConfig) => {
  if (config.provider === 'default') {
    // 对于默认配置，只发送provider标识，后端会使用内置配置
    return {
      provider: 'default',
      model: 'default',
      apiKey: '', // 后端会忽略
      apiUrl: ''  // 后端会忽略
    }
  }
  // 对于用户配置，发送完整配置
  return config
}

// 保存用户自定义API配置
export const saveUserAPIConfig = (config: DefaultAPIConfig): void => {
  try {
    localStorage.setItem('circuitsai_api_config', JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save API config:', error)
  }
}

// 切换到默认AI
export const useDefaultAPI = (): void => {
  saveUserAPIConfig(DEFAULT_API_CONFIG)
}

// 清除用户配置，恢复到默认配置
export const resetToDefaultAPI = (): void => {
  saveUserAPIConfig(DEFAULT_API_CONFIG)
}