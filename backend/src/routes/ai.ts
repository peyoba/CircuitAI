import { Router } from 'express'
import { chatWithAI, validateMessage, testApiConfig, getSupportedProviders, healthCheck } from '../controllers/aiController.js'

const router = Router()

// AI对话接口
router.post('/chat', validateMessage, chatWithAI)

// API配置测试
router.post('/test-config', testApiConfig)

// 获取支持的提供商
router.get('/providers', getSupportedProviders)

// 健康检查
router.get('/health', healthCheck)

// AI模型配置 (保持向后兼容)
router.get('/models', (_req, res) => {
  res.json({
    available_models: [
      { id: 'openai', name: 'OpenAI GPT', status: 'available' },
      { id: 'claude', name: 'Anthropic Claude', status: 'available' },
      { id: 'gemini', name: 'Google Gemini', status: 'available' },
      { id: 'custom', name: '自定义API', status: 'configurable' }
    ]
  })
})

export default router