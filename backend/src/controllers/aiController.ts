import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import logger from '../config/logger.js'
import { AIService } from '../services/ai/AIService.js'
import { APIAdapterFactory, ProviderConfig } from '../services/ai/APIAdapterFactory.js'

const messageSchema = Joi.object({
  message: Joi.string().required().min(1).max(2000),
  conversation_id: Joi.string().optional(),
  provider: Joi.string().optional().valid('openai', 'claude', 'gemini', 'custom', 'mock', 'deepseek', 'moonshot'),
  apiConfig: Joi.object({
    provider: Joi.string().required().valid('openai', 'claude', 'gemini', 'custom', 'mock', 'deepseek', 'moonshot'),
    apiKey: Joi.string().required(),
    apiUrl: Joi.string().required(),
    model: Joi.string().required(),
    maxTokens: Joi.number().optional(),
    temperature: Joi.number().optional(),
    requestFormat: Joi.string().optional().valid('openai', 'claude', 'custom'),
    responseFormat: Joi.string().optional().valid('openai', 'claude', 'custom'),
    customHeaders: Joi.object().optional()
  }).optional()
})

const apiConfigSchema = Joi.object({
  provider: Joi.string().required().valid('openai', 'claude', 'gemini', 'custom', 'mock', 'deepseek', 'moonshot'),
  apiKey: Joi.string().required(),
  apiUrl: Joi.string().required(),
  model: Joi.string().required(),
  maxTokens: Joi.number().optional(),
  temperature: Joi.number().optional(),
  requestFormat: Joi.string().optional().valid('openai', 'claude', 'custom'),
  responseFormat: Joi.string().optional().valid('openai', 'claude', 'custom'),
  customHeaders: Joi.object().optional()
})

export const validateMessage = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = messageSchema.validate(req.body)
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    })
    return
  }
  next()
}

export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const { message, conversation_id, provider = 'openai', apiConfig } = req.body
    
    logger.info(`AI Chat request: ${message.substring(0, 100)}...`)
    
    const aiService = new AIService()
    const response = await aiService.chat({
      message,
      conversationId: conversation_id,
      provider,
      apiConfig
    })
    
    res.json({
      success: true,
      data: {
        response: response.content,
        conversation_id: response.conversationId,
        provider: response.provider,
        circuit_data: response.circuitData,
        bom_data: response.bomData
      }
    })
  } catch (error) {
    logger.error('AI Chat error:', error)
    res.status(500).json({
      success: false,
      error: 'AI服务暂时不可用，请稍后再试'
    })
  }
}

export const testApiConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Received test config request: ' + JSON.stringify(req.body, null, 2))
    
    const { error } = apiConfigSchema.validate(req.body)
    if (error) {
      logger.error('Validation error:', error.details[0].message)
      res.status(400).json({
        success: false,
        error: error.details[0].message
      })
      return
    }
    
    const config = req.body as ProviderConfig
    logger.info(`Testing API config for provider: ${config.provider}`)
    
    const adapter = APIAdapterFactory.createAdapter(config)
    
    try {
      const isValid = await adapter.validateApiKey()
      
      if (isValid) {
        res.json({
          success: true,
          message: 'API配置测试成功'
        })
      } else {
        res.json({
          success: false,
          error: 'API密钥无效或配置错误'
        })
      }
    } catch (validationError: any) {
      logger.error('API validation detailed error:', validationError)
      
      // 提供更详细的错误信息
      let errorMessage = 'API密钥无效或配置错误'
      if (validationError.message) {
        if (validationError.message.includes('ETIMEDOUT')) {
          errorMessage = '连接超时，请检查网络和API地址'
        } else if (validationError.message.includes('401')) {
          errorMessage = 'API密钥无效或已过期'
        } else if (validationError.message.includes('403')) {
          errorMessage = 'API密钥权限不足或被禁用'
        } else if (validationError.message.includes('certificate')) {
          errorMessage = 'SSL证书验证失败，请检查API地址'
        } else if (validationError.message.includes('ENOTFOUND')) {
          errorMessage = 'API地址无法解析，请检查URL是否正确'
        } else {
          errorMessage = `连接失败: ${validationError.message}`
        }
      }
      
      res.json({
        success: false,
        error: errorMessage
      })
    }
  } catch (error) {
    logger.error('API config test error:', error)
    res.status(500).json({
      success: false,
      error: '测试失败，请检查API配置'
    })
  }
}

export const getSupportedProviders = async (_req: Request, res: Response) => {
  try {
    const providers = APIAdapterFactory.getSupportedProviders()
    res.json({
      success: true,
      data: providers
    })
  } catch (error) {
    logger.error('Get providers error:', error)
    res.status(500).json({
      success: false,
      error: '获取提供商列表失败'
    })
  }
}

export const healthCheck = async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          ai: 'operational',
          database: 'operational'
        }
      }
    })
  } catch (error) {
    logger.error('Health check error:', error)
    res.status(500).json({
      success: false,
      error: '健康检查失败'
    })
  }
}