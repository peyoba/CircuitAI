import { Router } from 'express'

const router = Router()

// 电路设计相关接口
router.post('/generate', (_req, res) => {
  // TODO: 实现电路生成逻辑
  res.json({
    message: '电路生成功能开发中',
    status: 'under_development'
  })
})

router.get('/components', (_req, res) => {
  // TODO: 返回元件库
  res.json({
    components: [
      { id: 'resistor', name: '电阻', category: 'passive' },
      { id: 'capacitor', name: '电容', category: 'passive' },
      { id: 'inductor', name: '电感', category: 'passive' }
    ]
  })
})

export default router