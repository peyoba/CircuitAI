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

prisma.$on('error', (e: any) => {
  logger.error('Database error:', e)
})

prisma.$on('warn', (e: any) => {
  logger.warn('Database warning:', e)
})

prisma.$on('info', (e: any) => {
  logger.info('Database info:', e)
})

prisma.$on('query', (e: any) => {
  logger.debug(`Query: ${e.query}`)
})

export default prisma