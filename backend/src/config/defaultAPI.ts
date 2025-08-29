// 后端默认API配置
// 这个配置对前端透明，用户无法看到实际的API密钥和提供商

// API密钥应该从环境变量读取，而不是硬编码
const getSecureAPIKey = (): string => {
  // 优先从环境变量读取
  const envKey = process.env.DEFAULT_GEMINI_API_KEY
  if (envKey) {
    return envKey
  }
  
  // 如果环境变量未设置，使用备用密钥（部署时应设置环境变量）
  const backupKey = 'AIzaSyCmuoDi9hHuMteG0yCY_WAmtumx_DS8z-k'
  console.warn('⚠️  使用备用API密钥，建议设置环境变量 DEFAULT_GEMINI_API_KEY')
  return backupKey
}

export const DEFAULT_API_CONFIG = {
  // 内部使用的实际配置（对外隐藏）
  internal: {
    provider: 'gemini',
    apiKey: getSecureAPIKey(),
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
    maxTokens: 4000,
    temperature: 0.7,
    requestFormat: 'custom' as const,
    responseFormat: 'custom' as const,
  },
  
  // 对前端展示的信息
  display: {
    name: '智能AI助手',
    description: '系统内置AI，开箱即用',
    isDefault: true,
  }
}

export const isDefaultProvider = (provider: string): boolean => {
  return provider === 'default' || provider === '智能AI助手'
}

export const getDefaultConfig = () => {
  return DEFAULT_API_CONFIG.internal
}