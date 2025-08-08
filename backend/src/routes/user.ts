import { Router } from 'express'

const router = Router()

// 用户相关接口
router.get('/profile', (_req, res) => {
  // TODO: 实现用户资料获取
  res.json({
    message: '用户功能开发中',
    status: 'under_development'
  })
})

export default router