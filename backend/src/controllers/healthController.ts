import { Request, Response } from 'express'
import { APIResponse } from '../utils/apiResponse.js'
import logger from '../config/logger.js'

export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  services: {
    ai: 'available' | 'unavailable'
    database: 'connected' | 'disconnected'
    memory: {
      used: number
      total: number
      percentage: number
    }
  }
}

export const getHealth = async (_req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage()
    const totalMemory = memoryUsage.heapTotal
    const usedMemory = memoryUsage.heapUsed
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100)
    
    const healthData: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        ai: 'available', // TODO: 实际检查AI服务状态
        database: 'disconnected', // TODO: 检查数据库连接状态
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: memoryPercentage
        }
      }
    }
    
    // 根据服务状态确定整体健康状态
    if (memoryPercentage > 90) {
      healthData.status = 'unhealthy'
    }
    
    const statusCode = healthData.status === 'healthy' ? 200 : 503
    APIResponse.success(res, healthData, '系统状态检查完成', statusCode)
    
  } catch (error) {
    logger.error('Health check error:', error)
    APIResponse.serverError(res, '健康检查失败')
  }
}

export const getVersion = async (_req: Request, res: Response) => {
  try {
    const versionInfo = {
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'development'
    }
    
    APIResponse.success(res, versionInfo, '版本信息获取成功')
  } catch (error) {
    logger.error('Version check error:', error)
    APIResponse.serverError(res, '版本信息获取失败')
  }
}
