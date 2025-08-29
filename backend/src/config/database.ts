import { PrismaClient } from '@prisma/client'
import logger from './logger.js'

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
})

prisma.$on('error', (e: { message: string; target?: string; timestamp: Date }) => {
  logger.error('Database error:', e)
})

prisma.$on('warn', (e: { message: string; target?: string; timestamp: Date }) => {
  logger.warn('Database warning:', e)
})

prisma.$on('info', (e: { message: string; target?: string; timestamp: Date }) => {
  logger.info('Database info:', e)
})

prisma.$on('query', (e: { query: string; params: string; duration: number; target: string; timestamp: Date }) => {
  logger.debug(`Query: ${e.query}`)
})

export default prisma