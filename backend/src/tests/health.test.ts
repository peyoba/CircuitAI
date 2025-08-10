import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import { getHealth, getVersion } from '../controllers/healthController.js'

const app = express()
app.get('/health', getHealth)
app.get('/version', getVersion)

describe('Health Controller', () => {
  describe('GET /health', () => {
    it('应该返回系统健康状态', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('status')
      expect(response.body.data).toHaveProperty('timestamp')
      expect(response.body.data).toHaveProperty('uptime')
      expect(response.body.data).toHaveProperty('services')
      expect(response.body.data.services).toHaveProperty('ai')
      expect(response.body.data.services).toHaveProperty('memory')
    })

    it('健康状态应该包含内存使用信息', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      const memoryInfo = response.body.data.services.memory
      expect(memoryInfo).toHaveProperty('used')
      expect(memoryInfo).toHaveProperty('total')
      expect(memoryInfo).toHaveProperty('percentage')
      expect(typeof memoryInfo.used).toBe('number')
      expect(typeof memoryInfo.total).toBe('number')
      expect(typeof memoryInfo.percentage).toBe('number')
    })
  })

  describe('GET /version', () => {
    it('应该返回版本信息', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('version')
      expect(response.body.data).toHaveProperty('node_version')
      expect(response.body.data).toHaveProperty('platform')
      expect(response.body.data).toHaveProperty('arch')
    })

    it('版本信息应该包含Node.js信息', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200)

      const versionInfo = response.body.data
      expect(versionInfo.node_version).toMatch(/^v\d+\.\d+\.\d+/)
      expect(versionInfo.platform).toBeTruthy()
      expect(versionInfo.arch).toBeTruthy()
    })
  })
})
