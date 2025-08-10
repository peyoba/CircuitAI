import { describe, it, expect, vi } from 'vitest'
import { Response } from 'express'
import { APIResponse } from '../utils/apiResponse.js'

// Mock Express Response
const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response
  return res
}

describe('APIResponse Utility', () => {
  describe('success', () => {
    it('应该返回成功响应', () => {
      const mockRes = createMockResponse()
      const testData = { id: 1, name: 'test' }
      
      APIResponse.success(mockRes, testData, '操作成功')
      
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testData,
        message: '操作成功',
        timestamp: expect.any(String)
      })
    })

    it('应该支持自定义状态码', () => {
      const mockRes = createMockResponse()
      
      APIResponse.success(mockRes, null, '创建成功', 201)
      
      expect(mockRes.status).toHaveBeenCalledWith(201)
    })
  })

  describe('error', () => {
    it('应该返回错误响应', () => {
      const mockRes = createMockResponse()
      
      APIResponse.error(mockRes, '操作失败', 400)
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: '操作失败',
        data: undefined,
        timestamp: expect.any(String)
      })
    })

    it('应该支持附加数据', () => {
      const mockRes = createMockResponse()
      const errorData = { details: 'validation failed' }
      
      APIResponse.error(mockRes, '验证失败', 400, errorData)
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: '验证失败',
        data: errorData,
        timestamp: expect.any(String)
      })
    })
  })

  describe('快捷方法', () => {
    it('validationError 应该返回400状态码', () => {
      const mockRes = createMockResponse()
      
      APIResponse.validationError(mockRes, '参数无效')
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: '参数验证失败: 参数无效',
        data: undefined,
        timestamp: expect.any(String)
      })
    })

    it('unauthorized 应该返回401状态码', () => {
      const mockRes = createMockResponse()
      
      APIResponse.unauthorized(mockRes, '需要登录')
      
      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('notFound 应该返回404状态码', () => {
      const mockRes = createMockResponse()
      
      APIResponse.notFound(mockRes, '资源不存在')
      
      expect(mockRes.status).toHaveBeenCalledWith(404)
    })

    it('serverError 应该返回500状态码', () => {
      const mockRes = createMockResponse()
      
      APIResponse.serverError(mockRes, '内部错误')
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })

  describe('时间戳', () => {
    it('应该包含有效的ISO时间戳', () => {
      const mockRes = createMockResponse()
      
      APIResponse.success(mockRes, null, '测试')
      
      const response = (mockRes.json as any).mock.calls[0][0]
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      
      // 验证时间戳是有效的日期
      const timestamp = new Date(response.timestamp)
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })
})
