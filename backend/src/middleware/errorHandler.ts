import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger.js'

export interface CustomError extends Error {
  statusCode?: number
  status?: string
}

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`) as CustomError
  error.statusCode = 404
  next(error)
}

export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = { ...err }
  error.message = err.message

  // 记录错误日志
  logger.error(err)

  // Mongoose 错误处理
  if (err.name === 'CastError') {
    const message = '资源未找到'
    error = { name: 'CastError', message } as CustomError
    error.statusCode = 404
  }

  // MongoDB 重复字段错误
  if (err.name === 'MongoError' && (err as { code?: number }).code === 11000) {
    const message = '重复字段值'
    error = { name: 'MongoError', message } as CustomError
    error.statusCode = 400
  }

  // 数据验证错误
  if (err.name === 'ValidationError') {
    const validationErr = err as { errors?: Record<string, { message: string }> }
    const message = validationErr.errors 
      ? Object.values(validationErr.errors).map(val => val.message).join(', ')
      : '数据验证失败'
    error = { name: 'ValidationError', message } as CustomError
    error.statusCode = 400
  }

  // AI服务相关错误
  if (err.message.includes('API key') || err.message.includes('apiKey')) {
    error.message = 'API密钥无效或未配置，请检查您的AI服务设置'
    error.statusCode = 401
  }

  // 网络连接错误
  if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
    error.message = 'AI服务连接失败，请检查网络连接或API地址'
    error.statusCode = 503
  }

  // 请求限流错误
  if (err.message.includes('rate limit') || err.message.includes('429')) {
    error.message = 'API请求频率过高，请稍后再试'
    error.statusCode = 429
  }

  // 电路生成错误
  if (err.message.includes('circuit') || err.message.includes('component')) {
    if (!error.statusCode || error.statusCode >= 500) {
      error.message = '电路生成失败，请检查输入参数或稍后重试'
      error.statusCode = 400
    }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || '服务器错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}