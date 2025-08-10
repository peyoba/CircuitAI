import { useState, useRef, useEffect } from 'react'
import { Input, Button, Avatar, message, Spin, Select } from 'antd'
import { SendOutlined, UserOutlined, RobotOutlined, ClearOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons'
import { ChatMessage } from '../../../../shared/dist/index.js'
import { aiAPI } from '../../services/api'
import EnhancedAPISettings from '../settings/EnhancedAPISettings'
import StatusIndicator from '../common/StatusIndicator'

const { TextArea } = Input
const { Option } = Select

interface CircuitData {
  ascii?: string
  description?: string
  components?: Array<{
    name: string
    type: string
    value?: string
    reference?: string
  }>
  connections?: Array<{
    id: string
    from: {
      component: string
      pin?: string
    }
    to: {
      component: string
      pin?: string
    }
    label?: string
    description?: string
  }>
  properties?: Array<{
    name: string
    value: string
    unit?: string
  }>
}

interface BOMData {
  items?: Array<{
    component: string
    quantity: number
    value?: string
    package?: string
    price?: number
  }>
  totalCost?: number
}

interface ChatPanelProps {
  onCircuitGenerated?: (circuitData: CircuitData) => void
  onBomGenerated?: (bomData: BOMData) => void
  onChatHistory?: (history: ChatMessage[]) => void
  initialMessages?: ChatMessage[]
}

const ChatPanel = ({ 
  onCircuitGenerated, 
  onBomGenerated, 
  onChatHistory,
  initialMessages 
}: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是CircuitsAI智能助手。我可以帮您：\n\n🔹 分析电路设计需求\n🔹 生成电路原理图\n🔹 提供元件选型建议\n🔹 计算电路参数\n\n请详细描述您想要设计的电路功能！',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('openai')
  const [showSettings, setShowSettings] = useState(false)
  const [apiConfigured, setApiConfigured] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [quickActions] = useState([
    '设计一个5V稳压电路',
    '帮我设计LED闪烁电路',
    '需要一个运放放大器',
    '设计音频功放电路'
  ])
  const [currentApiConfig, setCurrentApiConfig] = useState<{
    provider: string
    apiKey: string
    apiUrl: string
    model: string
    maxTokens?: number
    temperature?: number
    requestFormat?: 'openai' | 'claude' | 'custom'
    responseFormat?: 'openai' | 'claude' | 'custom'
    customHeaders?: Record<string, string>
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const conversationId = useRef<string>()

  const availableProviders = [
    { value: 'openai', label: 'OpenAI GPT', icon: '🤖' },
    { value: 'claude', label: 'Claude', icon: '🧠' },
    { value: 'gemini', label: 'Google Gemini', icon: '⭐' },
    { value: 'custom', label: '自定义API', icon: '⚙️' }
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // 检查是否已配置API
    const savedConfig = localStorage.getItem('circuitsai_api_config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        console.log('加载的API配置:', config)
        setCurrentApiConfig(config)
        setApiConfigured(!!config.apiKey)
        setSelectedProvider(config.provider || 'openai')
      } catch (error) {
        console.error('Failed to load API config:', error)
      }
    }
  }, [])

  // 初始化聊天历史
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages)
    }
  }, [initialMessages])

  // 当messages变化时，通知父组件
  useEffect(() => {
    if (onChatHistory && messages.length > 1) { // 跳过初始欢迎消息
      onChatHistory(messages)
    }
  }, [messages, onChatHistory])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // 调用后端API
      console.log('发送到后端的配置:', {
        provider: selectedProvider,
        apiConfig: currentApiConfig || undefined
      })
      const response = await aiAPI.chat({
        message: userMessage.content,
        conversationId: conversationId.current,
        provider: selectedProvider,
        apiConfig: currentApiConfig || undefined
      })

      // 更新会话ID
      if (response.data.conversationId) {
        conversationId.current = response.data.conversationId
      }
      
      // 模拟打字效果
      setIsTyping(true)
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      }

      // 添加短暂延迟模拟真实对话
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage])
        setIsTyping(false)
      }, 500)

      // 检查是否包含电路图或BOM数据
      if (response.data.circuit_data && onCircuitGenerated) {
        onCircuitGenerated(response.data.circuit_data)
      }
      if (response.data.bom_data && onBomGenerated) {
        onBomGenerated(response.data.bom_data)
      }

    } catch (error: unknown) {
      console.error('发送消息失败:', error)
      
      let errorContent = '抱歉，我现在无法回复。'
      
      // 根据错误类型提供更具体的错误信息
      const err = error as { 
        response?: { status?: number; data?: { error?: string } }; 
        code?: string; 
        message?: string 
      }
      if (err?.response?.status === 401) {
        errorContent = '❌ API密钥无效或未配置，请在设置中检查您的AI服务配置。'
      } else if (err?.response?.status === 429) {
        errorContent = '⏳ API请求频率过高，请稍等片刻后再试。'
      } else if (err?.response?.status === 503) {
        errorContent = '🔌 AI服务连接失败，请检查网络连接或API地址配置。'
      } else if (err?.code === 'ECONNABORTED') {
        errorContent = '⏱️ 请求超时，AI服务响应时间过长，请稍后重试。'
      } else if (err?.message?.includes('Network Error')) {
        errorContent = '🌐 网络连接错误，请检查您的网络连接。'
      } else if (err?.response?.data?.error) {
        errorContent = `❌ ${err.response.data.error}`
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      // 显示错误提示
      message.error(errorContent)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: '对话已清空。请告诉我您想要设计什么样的电路？',
      timestamp: new Date()
    }])
  }

  const exportChat = () => {
    const chatText = messages.map(msg => 
      `${msg.role === 'user' ? '用户' : 'AI助手'} (${msg.timestamp.toLocaleString()}):\n${msg.content}\n\n`
    ).join('')
    
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CircuitsAI_Chat_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleAPIConfig = (config: {
    provider: string
    apiKey: string
    apiUrl: string
    model: string
    maxTokens?: number
    temperature?: number
    requestFormat?: 'openai' | 'claude' | 'custom'
    responseFormat?: 'openai' | 'claude' | 'custom'
    customHeaders?: Record<string, string>
  }) => {
    console.log('API配置已更新:', config)
    setCurrentApiConfig(config)
    setSelectedProvider(config.provider)
    setApiConfigured(!!config.apiKey)
    message.success('API配置已更新')
  }

  const formatMessage = (content: string) => {
    // 简单的markdown格式化
    return content
      .replace(/```([\s\S]*?)```/g, '<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 2px;">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <RobotOutlined className="text-blue-500 text-lg" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">AI设计助手</h3>
            <StatusIndicator 
              model={availableProviders.find(p => p.value === selectedProvider)?.label || selectedProvider}
              isConfigured={apiConfigured}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedProvider}
            onChange={setSelectedProvider}
            size="small"
            style={{ width: 140 }}
          >
            {availableProviders.map(provider => (
              <Option key={provider.value} value={provider.value}>
                {provider.icon} {provider.label}
              </Option>
            ))}
          </Select>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={exportChat}
            size="small"
            type="text"
            title="导出对话"
          />
          <Button 
            icon={<ClearOutlined />} 
            onClick={clearChat}
            size="small"
            type="text"
            title="清空对话"
          />
          <Button 
            icon={<SettingOutlined />} 
            onClick={() => setShowSettings(true)}
            size="small"
            type="text"
            title="API设置"
          />
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <Avatar 
              icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
              className={msg.role === 'user' ? 'bg-blue-500' : 'bg-green-500'}
            />
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div 
                className={`p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
              <div className="text-xs text-gray-500 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <Avatar icon={<RobotOutlined />} className="bg-green-500" />
            <div className="bg-gray-100 p-3 rounded-lg">
              <Spin size="small" /> 正在分析您的需求...
            </div>
          </div>
        )}

        {isTyping && (
          <div className="flex gap-3">
            <Avatar icon={<RobotOutlined />} className="bg-green-500" />
            <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-gray-600">正在整理电路方案...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作 */}
      {messages.length <= 1 && (
        <div className="border-t p-4 bg-white">
          <div className="text-sm text-gray-600 mb-3">💡 快速开始：</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                size="small"
                type="dashed"
                onClick={() => {
                  setInputMessage(action)
                  textAreaRef.current?.focus()
                }}
                className="text-blue-600 border-blue-300 hover:border-blue-500 hover:text-blue-700"
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex gap-2">
          <TextArea
            ref={textAreaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="描述您的电路设计需求..."
            rows={3}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="primary" 
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="h-20"
          >
            发送
          </Button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>

      {/* API设置弹窗 */}
      <EnhancedAPISettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleAPIConfig}
      />
    </div>
  )
}

export default ChatPanel