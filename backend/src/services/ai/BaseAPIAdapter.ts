import axios, { AxiosResponse, AxiosRequestConfig } from 'axios'
import https from 'https'
import logger from '../../config/logger.js'

export interface APIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface APIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface APIConfig {
  apiKey: string
  apiUrl: string
  model: string
  maxTokens?: number
  temperature?: number
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  connectTimeout?: number
  socketTimeout?: number
}

export abstract class BaseAPIAdapter {
  protected config: APIConfig

  constructor(config: APIConfig) {
    this.config = {
      maxTokens: 2000,
      temperature: 0.7,
      timeout: 120000, // 增加默认超时时间到120秒，适应慢速API
      maxRetries: 3,
      retryDelay: 1000,
      connectTimeout: 15000, // 连接超时15秒
      socketTimeout: 105000, // 套接字超时105秒
      ...config
    }
  }

  abstract chat(messages: APIMessage[], options?: any): Promise<string>
  abstract validateApiKey(): Promise<boolean>
  abstract formatMessages(messages: APIMessage[]): any
  abstract parseResponse(response: any): APIResponse

  protected async makeRequest(endpoint: string, data: any, options?: any): Promise<AxiosResponse> {
    const requestUrl = `${this.config.apiUrl.replace(/\/$/, '')}${endpoint}`
    let lastError: any

    for (let attempt = 1; attempt <= (this.config.maxRetries || 3); attempt++) {
      const startTime = Date.now()
      
      try {
        logger.info('Making API request:', {
          url: requestUrl,
          method: 'POST',
          provider: this.constructor.name,
          attempt: `${attempt}/${this.config.maxRetries}`,
          dataSize: JSON.stringify(data).length
        })

        // 使用传入的超时时间，如果没有则使用配置的默认值
        const requestTimeout = options?.timeout || this.config.timeout
        
        // 创建axios配置，增强网络处理
        const axiosConfig: AxiosRequestConfig = {
          headers: this.getHeaders(),
          timeout: requestTimeout,
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // 临时解决SSL证书问题
            timeout: this.config.connectTimeout,
            keepAlive: true,
            maxSockets: 50
          }),
          // 增加更详细的超时配置
          timeoutErrorMessage: `请求超时 (${requestTimeout}ms)`,
        }

        const response = await axios.post(requestUrl, data, axiosConfig)

        const duration = Date.now() - startTime
        logger.info('API request successful:', {
          url: requestUrl,
          status: response.status,
          duration: `${duration}ms`,
          attempt: `${attempt}/${this.config.maxRetries}`,
          responseSize: JSON.stringify(response.data).length
        })

        return response
      } catch (error: any) {
        const duration = Date.now() - startTime
        lastError = error
        
        // 详细的错误日志
        logger.error('API request failed:', {
          url: requestUrl,
          method: 'POST',
          provider: this.constructor.name,
          duration: `${duration}ms`,
          attempt: `${attempt}/${this.config.maxRetries}`,
          error: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          requestHeaders: this.getHeaders(),
          timeout: this.config.timeout
        })

        // 判断是否应该重试
        const shouldRetry = this.shouldRetry(error, attempt)
        
        if (!shouldRetry || attempt === (this.config.maxRetries || 3)) {
          throw this.handleError(error)
        }

        // 等待重试延迟（指数退避）
        const retryDelay = (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1)
        logger.info(`Retrying in ${retryDelay}ms...`, {
          attempt: `${attempt}/${this.config.maxRetries}`,
          nextAttempt: attempt + 1
        })
        
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }

    throw this.handleError(lastError)
  }

  // 判断是否应该重试的逻辑
  private shouldRetry(error: any, attempt: number): boolean {
    // 如果已经达到最大重试次数，不再重试
    if (attempt >= (this.config.maxRetries || 3)) {
      return false
    }

    // 网络错误应该重试
    if (error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNABORTED' || 
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED') {
      return true
    }

    // 5xx服务器错误应该重试
    if (error.response?.status >= 500) {
      return true
    }

    // 429 限流错误应该重试
    if (error.response?.status === 429) {
      return true
    }

    // 503 服务不可用应该重试
    if (error.response?.status === 503) {
      return true
    }

    // 4xx客户端错误（除了429）通常不应该重试
    return false
  }

  protected abstract getHeaders(): Record<string, string>

  protected handleError(error: any): Error {
    // 添加更详细的错误信息和调试信息
    console.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.config?.headers,
      code: error.code,
      message: error.message
    })

    if (error.response?.status === 401) {
      return new Error('API密钥无效或已过期')
    } else if (error.response?.status === 429) {
      return new Error('API调用频率超限，请稍后再试')
    } else if (error.response?.status === 402) {
      return new Error('API配额已用完，请检查账户余额')
    } else if (error.response?.status === 403) {
      return new Error('API访问被拒绝，请检查密钥权限')
    } else if (error.response?.status === 404) {
      return new Error('API端点不存在，请检查URL配置')
    } else if (error.code === 'ECONNABORTED') {
      return new Error('请求超时，请检查网络连接或增加超时时间')
    } else if (error.code === 'ETIMEDOUT') {
      return new Error('连接超时，请检查网络和API地址。如果是Gemini API，可能需要VPN或代理')
    } else if (error.code === 'ENOTFOUND') {
      return new Error('无法解析API地址，请检查URL是否正确或网络DNS设置')
    } else if (error.code === 'ECONNREFUSED') {
      return new Error('连接被拒绝，请检查API服务是否可用')
    } else if (error.code === 'CERT_HAS_EXPIRED') {
      return new Error('SSL证书已过期')
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      return new Error('SSL证书验证失败，请检查API地址')
    } else {
      // 更详细的错误信息处理
      const message = error.message || error.code || 'Unknown error'
      const statusText = error.response?.statusText
      const responseData = error.response?.data
      
      let errorDetails = message
      if (statusText && statusText !== message) {
        errorDetails = `${message} (${statusText})`
      }
      if (responseData && typeof responseData === 'object') {
        const errorMsg = responseData.error || responseData.message || responseData.detail || responseData.error_description
        if (errorMsg && typeof errorMsg === 'string') {
          errorDetails = `${errorDetails}: ${errorMsg}`
        }
      }
      
      return new Error(`API调用失败: ${errorDetails}`)
    }
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.apiUrl)
  }

  getModel(): string {
    return this.config.model
  }

  updateConfig(config: Partial<APIConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // 新增：获取配置信息用于调试
  getConfigInfo(): any {
    return {
      provider: this.constructor.name,
      model: this.config.model,
      apiUrl: this.config.apiUrl,
      hasApiKey: !!this.config.apiKey,
      apiKeyPrefix: this.config.apiKey ? this.config.apiKey.substring(0, 8) + '...' : 'none',
      timeout: this.config.timeout
    }
  }
}