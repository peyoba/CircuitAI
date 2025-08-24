import { ChatMessage } from '../../../../shared/dist/index.js'
import logger from '../../config/logger.js'

export interface Conversation {
  id: string
  messages: ChatMessage[]
  context: ConversationContext
  createdAt: Date
  updatedAt: Date
}

export interface ConversationContext {
  phase: 'requirement' | 'design' | 'validation' | 'optimization'
  conversationType?: 'circuit_design' | 'general'
  circuitType?: string
  requirements?: Record<string, any>
  currentDesign?: any
  userExpertise?: 'beginner' | 'intermediate' | 'expert'
}

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map()
  private maxConversations: number = 1000
  private maxMessagesPerConversation: number = 100

  createConversation(_userId?: string): string {
    const conversationId = this.generateConversationId()
    
    const conversation: Conversation = {
      id: conversationId,
      messages: [],
      context: {
        phase: 'requirement',
        userExpertise: 'intermediate'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.conversations.set(conversationId, conversation)
    
    // 清理旧会话
    if (this.conversations.size > this.maxConversations) {
      this.cleanupOldConversations()
    }

    logger.info(`Created conversation: ${conversationId}`)
    return conversationId
  }

  addMessage(conversationId: string, message: ChatMessage): void {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    conversation.messages.push(message)
    conversation.updatedAt = new Date()

    // 限制消息数量
    if (conversation.messages.length > this.maxMessagesPerConversation) {
      conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation)
    }

    // 更新上下文
    this.updateContext(conversation, message)

    logger.debug(`Added message to conversation ${conversationId}`)
  }

  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId)
  }

  getMessages(conversationId: string, limit?: number): ChatMessage[] {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      return []
    }

    const messages = conversation.messages
    return limit ? messages.slice(-limit) : messages
  }

  getContext(conversationId: string): ConversationContext | undefined {
    const conversation = this.conversations.get(conversationId)
    return conversation?.context
  }

  updateContext(conversation: Conversation, message: ChatMessage): void {
    const content = message.content.toLowerCase()

    // 如果是用户消息，分析内容并更新上下文
    if (message.role === 'user') {
      // 检测对话类型（添加新的上下文字段）
      if (!conversation.context.conversationType) {
        conversation.context.conversationType = this.detectConversationType(content)
      }

      // 只有在电路设计对话中才更新专业上下文
      if (conversation.context.conversationType === 'circuit_design') {
        // 检测电路类型
        if (content.includes('led') || content.includes('发光二极管')) {
          conversation.context.circuitType = 'led_circuit'
        } else if (content.includes('电源') || content.includes('稳压')) {
          conversation.context.circuitType = 'power_supply'
        } else if (content.includes('放大器') || content.includes('运放')) {
          conversation.context.circuitType = 'amplifier'
        } else if (content.includes('滤波器')) {
          conversation.context.circuitType = 'filter'
        } else if (content.includes('振荡器')) {
          conversation.context.circuitType = 'oscillator'
        }

        // 检测用户专业水平
        if (content.includes('初学') || content.includes('新手') || content.includes('不懂')) {
          conversation.context.userExpertise = 'beginner'
        } else if (content.includes('专业') || content.includes('资深') || content.includes('工程师')) {
          conversation.context.userExpertise = 'expert'
        }

        // 检测设计阶段
        if (content.includes('需求') || content.includes('要求') || message.role === 'user' && conversation.messages.length <= 2) {
          conversation.context.phase = 'requirement'
        } else if (content.includes('设计') || content.includes('电路图') || content.includes('原理图')) {
          conversation.context.phase = 'design'
        } else if (content.includes('检查') || content.includes('验证') || content.includes('测试')) {
          conversation.context.phase = 'validation'
        } else if (content.includes('优化') || content.includes('改进') || content.includes('提升')) {
          conversation.context.phase = 'optimization'
        }
      }
    }
  }

  // 检测对话类型的辅助方法
  private detectConversationType(content: string): 'circuit_design' | 'general' {
    const circuitKeywords = [
      '电路', '设计', '原理图', '电阻', '电容', '电感', '二极管', '三极管', 
      'led', 'circuit', 'resistor', 'capacitor', 'diode', 'transistor',
      '稳压', '放大器', '滤波器', '振荡器', '电源', '功率', '电压', '电流',
      'regulator', 'amplifier', 'filter', 'oscillator', 'power', 'voltage', 'current',
      '运放', 'ic', '芯片', '单片机', 'mcu', 'arduino', 'esp32',
      'bom', '物料', '元件', 'component', '焊接', 'pcb'
    ]

    const hasCircuitKeywords = circuitKeywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    )

    return hasCircuitKeywords ? 'circuit_design' : 'general'
  }

  clearConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId)
    if (conversation) {
      conversation.messages = []
      conversation.context = {
        phase: 'requirement',
        userExpertise: conversation.context.userExpertise || 'intermediate'
      }
      conversation.updatedAt = new Date()
    }
  }

  deleteConversation(conversationId: string): boolean {
    return this.conversations.delete(conversationId)
  }

  getConversationSummary(conversationId: string): string {
    const conversation = this.conversations.get(conversationId)
    if (!conversation || conversation.messages.length === 0) {
      return ''
    }

    const userMessages = conversation.messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ')

    return userMessages.substring(0, 200) + (userMessages.length > 200 ? '...' : '')
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private cleanupOldConversations(): void {
    const conversations = Array.from(this.conversations.entries())
    conversations.sort((a, b) => b[1].updatedAt.getTime() - a[1].updatedAt.getTime())
    
    // 保留最新的一半会话
    const toKeep = Math.floor(this.maxConversations / 2)
    const toDelete = conversations.slice(toKeep)
    
    toDelete.forEach(([id]) => {
      this.conversations.delete(id)
    })

    logger.info(`Cleaned up ${toDelete.length} old conversations`)
  }

  // 获取统计信息
  getStats() {
    return {
      totalConversations: this.conversations.size,
      totalMessages: Array.from(this.conversations.values())
        .reduce((sum, conv) => sum + conv.messages.length, 0),
      averageMessagesPerConversation: this.conversations.size > 0 
        ? Array.from(this.conversations.values())
            .reduce((sum, conv) => sum + conv.messages.length, 0) / this.conversations.size
        : 0
    }
  }
}