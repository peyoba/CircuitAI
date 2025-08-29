import { Response } from 'express'
import logger from '../config/logger.js'

export interface APIResponseData<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

export class APIResponse {
  static success<T>(res: Response, data?: T, message?: string, statusCode = 200): Response {
    const response: APIResponseData<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }
    
    return res.status(statusCode).json(response)
  }
  
  static error(res: Response, error: string, statusCode = 500, data?: unknown): Response {
    const response: APIResponseData = {
      success: false,
      error,
      data,
      timestamp: new Date().toISOString()
    }
    
    logger.error(`API Error [${statusCode}]: ${error}`)
    return res.status(statusCode).json(response)
  }
  
  static validationError(res: Response, error: string): Response {
    return this.error(res, `参数验证失败: ${error}`, 400)
  }
  
  static notFound(res: Response, message = '资源未找到'): Response {
    return this.error(res, message, 404)
  }
  
  static unauthorized(res: Response, message = '未授权访问'): Response {
    return this.error(res, message, 401)
  }
  
  static forbidden(res: Response, message = '禁止访问'): Response {
    return this.error(res, message, 403)
  }
  
  static serverError(res: Response, message = '服务器内部错误'): Response {
    return this.error(res, message, 500)
  }
  
  static rateLimited(res: Response, message = 'API请求频率过高，请稍后再试'): Response {
    return this.error(res, message, 429)
  }
  
  static serviceUnavailable(res: Response, message = '服务暂时不可用'): Response {
    return this.error(res, message, 503)
  }
}

// 类型定义
export interface ChatResponseData {
  response: string
  conversation_id: string
  provider: string
  circuit_data?: unknown
  bom_data?: unknown
}

export interface ConfigTestResult {
  isValid: boolean
  provider: string
  model?: string
  error?: string
}
