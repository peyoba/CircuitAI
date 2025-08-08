import { Router } from 'express'
import aiRoutes from './ai.js'
import circuitRoutes from './circuit.js'
import userRoutes from './user.js'

const router = Router()

// API路由
router.use('/ai', aiRoutes)
router.use('/circuit', circuitRoutes)
router.use('/user', userRoutes)

// API信息
router.get('/', (_req, res) => {
  res.json({
    message: 'CircuitsAI API',
    version: '0.1.0',
    endpoints: {
      ai: '/api/ai',
      circuit: '/api/circuit',
      user: '/api/user'
    }
  })
})

export default router