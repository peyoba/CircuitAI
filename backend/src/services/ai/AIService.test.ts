import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIService, ChatRequest } from './AIService'

// Mock the entire ConversationManager module
vi.mock('./ConversationManager', () => ({
  ConversationManager: class {
    addMessage = vi.fn()
    getConversation = vi.fn().mockReturnValue(null)
    getMessages = vi.fn().mockReturnValue([
      { id: '1', role: 'user', content: 'test message', timestamp: new Date() }
    ])
    getContext = vi.fn().mockReturnValue({ phase: 'requirement' })
    createConversation = vi.fn().mockReturnValue('test-conversation-id')
    getStats = vi.fn().mockReturnValue({ totalConversations: 1, totalMessages: 1 })
  }
}))

// Mock the API adapter factory
vi.mock('./APIAdapterFactory', () => ({
  APIAdapterFactory: {
    createAdapter: vi.fn().mockReturnValue({
      chat: vi.fn().mockResolvedValue('Mock AI response'),
      validateApiKey: vi.fn().mockResolvedValue(true)
    })
  }
}))

describe('AIService', () => {
  let aiService: AIService
  
  beforeEach(() => {
    aiService = new AIService()
    vi.clearAllMocks()
  })

  describe('chat', () => {
    it('should process chat message successfully with valid config', async () => {
      const request: ChatRequest = {
        message: '设计LED电路',
        provider: 'openai',
        apiConfig: {
          provider: 'openai',
          apiKey: 'test-key',
          apiUrl: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        }
      }

      const result = await aiService.chat(request)

      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('conversationId')
      expect(result).toHaveProperty('provider', 'openai')
      expect(typeof result.content).toBe('string')
    })

    it('should handle invalid config gracefully', async () => {
      const request: ChatRequest = {
        message: '设计LED电路',
        provider: 'openai',
        apiConfig: {
          provider: 'openai',
          apiKey: '', // Empty API key
          apiUrl: '',
          model: ''
        }
      }

      await expect(aiService.chat(request)).rejects.toThrow()
    })

    it('should reuse existing conversation', async () => {
      // 首先创建一个会话
      const createRequest: ChatRequest = {
        message: '初始消息',
        provider: 'openai',
        apiConfig: {
          provider: 'openai',
          apiKey: 'test-key',
          apiUrl: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        }
      }
      
      const firstResult = await aiService.chat(createRequest)
      const conversationId = firstResult.conversationId
      
      // 然后复用这个会话
      const request: ChatRequest = {
        message: '继续之前的设计',
        conversationId: conversationId,
        provider: 'openai',
        apiConfig: {
          provider: 'openai',
          apiKey: 'test-key',
          apiUrl: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        }
      }

      const result = await aiService.chat(request)

      expect(result.conversationId).toBe(conversationId)
    })
  })

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      const result = await aiService.validateApiKey('openai', 'test-key', 'https://api.openai.com/v1')

      expect(result).toBe(true)
    })

    it('should handle validation error', async () => {
      try {
        const result = await aiService.validateApiKey('invalid', 'invalid-key')
        expect(result).toBe(false)
      } catch (error) {
        // 预期会因为无效的配置而抛出错误
        expect(error).toBeDefined()
      }
    })
  })

  describe('getStats', () => {
    it('should return conversation statistics', () => {
      const stats = aiService.getStats()

      expect(stats).toHaveProperty('totalConversations')
      expect(stats).toHaveProperty('totalMessages')
    })
  })
})