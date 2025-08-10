import { Router } from 'express'
import aiRoutes from './ai.js'
import circuitRoutes from './circuit.js'
import userRoutes from './user.js'
import { getHealth, getVersion } from '../controllers/healthController.js'
import { APIResponse } from '../utils/apiResponse.js'

const router = Router()

// API路由
router.use('/ai', aiRoutes)
router.use('/circuit', circuitRoutes)
router.use('/user', userRoutes)

// 系统路由
router.get('/health', getHealth)
router.get('/version', getVersion)

// API信息
router.get('/', (_req, res) => {
  const apiInfo = {
    name: 'CircuitsAI API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      ai: '/api/ai',
      circuit: '/api/circuit',
      user: '/api/user',
      health: '/api/health',
      version: '/api/version'
    },
    documentation: 'https://github.com/your-username/circuitsai/docs'
  }
  
  APIResponse.success(res, apiInfo, 'CircuitsAI API 欢迎您')
})

export default router