import { useState, useRef, useEffect } from 'react'
import { Input, Button, Avatar, message, Spin, Select } from 'antd'
import { SendOutlined, UserOutlined, RobotOutlined, ClearOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons'
import { ChatMessage } from '../../../../shared/src/types/index'
import { aiAPI } from '../../services/api'
import EnhancedAPISettings from '../settings/EnhancedAPISettings'
import StatusIndicator from '../common/StatusIndicator'
import RequirementCardSidebar, { Requirements } from './RequirementCardSidebar'
import { useI18n } from '../../i18n/I18nProvider'

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
  const conversationId = useRef<string>(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [requirements, setRequirements] = useState<Requirements>({
    type: '',
    inputPower: '',
    outputTarget: '',
    load: '',
    priorities: [],
    environment: '',
    preferences: '',
    acceptanceCriteria: ''
  })
  const [risks, setRisks] = useState<string[]>([])
  const [changes, setChanges] = useState<string[]>([])
  const { t } = useI18n()

  const availableProviders = [
    { value: 'openai', label: 'OpenAI GPT', icon: '🤖' },
    { value: 'claude', label: 'Claude', icon: '🧠' },
    { value: 'gemini', label: 'Google Gemini', icon: '⭐' },
    { value: 'doubao', label: 'Doubao', icon: '🐯' },
    { value: 'siliconflow', label: 'SiliconFlow', icon: '⚡' },
    { value: 'qwen', label: 'Qwen', icon: '🌿' },
    { value: 'perplexity', label: 'Perplexity', icon: '🔎' },
    { value: 'custom', label: 'Custom API', icon: '⚙️' }
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // 加载持久化的需求卡片/风险/变更
    try {
      const savedReq = localStorage.getItem('circuitsai_requirements')
      const savedRisks = localStorage.getItem('circuitsai_requirements_risks')
      const savedChanges = localStorage.getItem('circuitsai_requirements_changes')
      if (savedReq) setRequirements(JSON.parse(savedReq))
      if (savedRisks) setRisks(JSON.parse(savedRisks))
      if (savedChanges) setChanges(JSON.parse(savedChanges))
    } catch {}
  }, [])

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

  // 持久化需求卡片/风险/变更
  useEffect(() => {
    try { localStorage.setItem('circuitsai_requirements', JSON.stringify(requirements)) } catch {}
  }, [requirements])
  useEffect(() => {
    try { localStorage.setItem('circuitsai_requirements_risks', JSON.stringify(risks)) } catch {}
  }, [risks])
  useEffect(() => {
    try { localStorage.setItem('circuitsai_requirements_changes', JSON.stringify(changes)) } catch {}
  }, [changes])

  const extractFromText = (text: string) => {
    const lower = text.toLowerCase()
    const result: Partial<Requirements> = {}

    // 类型
    if (/稳压|恒压/.test(text)) result.type = '电源稳压'
    else if (/led/.test(lower) || /发光|灯/.test(text)) result.type = 'LED驱动'
    else if (/放大|运放/.test(text)) result.type = '放大器'
    else if (/音频|功放/.test(text)) result.type = '音频功放'

    // 输入电源
    const inputMatch = text.match(/(输入|供电|电源|VCC)[^\d]{0,6}(\d+(?:\.\d+)?\s*(?:V|伏))/i)
    const anyV = text.match(/(\d+(?:\.\d+)?\s*(?:V|伏))(?:\s*-\s*(\d+(?:\.\d+)?\s*(?:V|伏)))?/i)
    if (inputMatch) result.inputPower = inputMatch[2]
    else if (anyV) result.inputPower = anyV[0]

    // 目标输出
    const cc = text.match(/恒流\s*(\d+(?:\.\d+)?\s*mA)/i)
    const cv = text.match(/恒压\s*(\d+(?:\.\d+)?\s*V)/i)
    const gain = text.match(/增益\s*(\d+(?:\.\d+)?\s*dB)/i)
    if (cc) result.outputTarget = `恒流 ${cc[1]}`
    else if (cv) result.outputTarget = `恒压 ${cv[1]}`
    else if (gain) result.outputTarget = `增益 ${gain[1]}`

    // 负载
    if (/LED\s*\d*/i.test(text) || /发光二极管|指示灯/.test(text)) result.load = 'LED'
    else if (/扬声器|喇叭|8Ω|8 Ohm/i.test(text)) result.load = '扬声器/8Ω'
    else if (/电机|马达/.test(text)) result.load = '电机'
    else if (/传感器/.test(text)) result.load = '传感器'

    // 优先级
    const prios: string[] = []
    if (/成本/.test(text)) prios.push('成本')
    if (/体积/.test(text)) prios.push('体积')
    if (/效率/.test(text)) prios.push('效率')
    if (/噪声/.test(text)) prios.push('噪声')
    if (/精度/.test(text)) prios.push('精度')
    if (prios.length) result.priorities = Array.from(new Set(prios))

    // 验收标准（抓取“验收标准”小节或典型约束）
    const accSection = text.match(/##\s*验收标准([\s\S]*?)(?=##|$)/i)
    if (accSection) {
      result.acceptanceCriteria = accSection[1].trim().slice(0, 300)
    } else {
      const parts: string[] = []
      const eff = text.match(/效率\s*[≥>=]\s*([\d.]+%)/)
      const ripple = text.match(/纹波\s*[≤<=]\s*([\d.]+\s*(?:mV|V))/)
      const cost = text.match(/成本\s*[≤<=]\s*([\d.]+\s*元?)/)
      if (eff) parts.push(`效率≥${eff[1]}`)
      if (ripple) parts.push(`纹波≤${ripple[1]}`)
      if (cost) parts.push(`成本≤${cost[1]}`)
      if (parts.length) result.acceptanceCriteria = parts.join('，')
    }

    return result
  }

  const autoExtractRequirementsFromConversation = () => {
    const lastUserMessages = messages.filter(m => m.role === 'user').slice(-5)
    if (lastUserMessages.length === 0) return
    const merged = lastUserMessages.map(m => m.content).join('\n')
    const extracted = extractFromText(merged)
    setRequirements(prev => ({
      ...prev,
      ...extracted,
    }))
  }

  const updateRequirementsFromAssistant = (assistantText: string) => {
    const extracted = extractFromText(assistantText)
    const next: Requirements = { ...requirements }
    const changesList: string[] = []

    ;(['type','inputPower','outputTarget','load','acceptanceCriteria'] as const).forEach((key) => {
      const newVal = (extracted as any)[key]
      if (newVal && (next as any)[key] !== newVal) {
        const oldVal = (next as any)[key] || '未设置'
        changesList.push(`${key}: ${oldVal} -> ${newVal}`)
        ;(next as any)[key] = newVal
      }
    })

    if (extracted.priorities && extracted.priorities.length) {
      const merged = Array.from(new Set([...(next.priorities || []), ...extracted.priorities]))
      if (merged.length !== (next.priorities || []).length) {
        changesList.push(`priorities -> ${merged.join('、')}`)
      }
      next.priorities = merged
    }

    if (changesList.length) {
      setRequirements(next)
      setChanges(prev => [...prev, ...changesList])
    }

    // 简单风险评估占位
    const newRisks: string[] = []
    if (!next.inputPower) newRisks.push('输入电源未明确，可能影响器件耐压与效率选型')
    if (!next.outputTarget) newRisks.push('输出目标未明确，无法进行参数计算与校核')
    if (!next.load) newRisks.push('负载特性未明确，驱动/功率预算存在不确定性')
    if (!next.priorities || next.priorities.length === 0) newRisks.push('未设置优先级，难以在方案间做取舍')
    setRisks(newRisks)
  }

  const handleRequirementsChange = (next: Requirements) => {
    // 记录变更
    const diffs: string[] = []
    const prev = requirements
    ;(['type','inputPower','outputTarget','load','environment','preferences','acceptanceCriteria'] as const).forEach((key) => {
      if ((prev as any)[key] !== (next as any)[key]) {
        const oldVal = (prev as any)[key] || '未设置'
        const newVal = (next as any)[key] || '未设置'
        diffs.push(`${key}: ${oldVal} -> ${newVal}`)
      }
    })
    if (JSON.stringify(prev.priorities) !== JSON.stringify(next.priorities)) {
      diffs.push(`priorities: ${(prev.priorities||[]).join('、')||'未设置'} -> ${(next.priorities||[]).join('、')||'未设置'}`)
    }
    if (diffs.length) setChanges(prevChanges => [...prevChanges, ...diffs])

    setRequirements(next)
  }

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

      // 更新会话ID (兼容不同字段名)
      if (response.data.conversationId || response.data.conversation_id) {
        conversationId.current = response.data.conversationId || response.data.conversation_id
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
        updateRequirementsFromAssistant(response.data.response || '')
      }, 500)

      // 检查是否包含电路图或BOM数据，添加调试日志
      console.log('检查响应数据:', {
        hasCircuitData: !!response.data.circuit_data,
        hasBomData: !!response.data.bom_data,
        circuitComponents: response.data.circuit_data?.components?.length || 0,
        bomItems: response.data.bom_data?.items?.length || 0
      })
      
      if (response.data.circuit_data && onCircuitGenerated) {
        console.log('传递电路数据到父组件:', response.data.circuit_data)
        onCircuitGenerated(response.data.circuit_data)
      }
      if (response.data.bom_data && onBomGenerated) {
        console.log('传递BOM数据到父组件:', response.data.bom_data)
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
      .replace(/```([\s\S]*?)```/g, '<pre style="背景: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 2px;">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
  }

  const buildDraftPromptFromRequirements = (req: Requirements) => {
    const lines: string[] = []
    lines.push('请根据以下“需求卡片”生成电路草案，包含：电路说明、ASCII电路图、元件列表、连接关系、BOM、关键参数计算与注意事项。')
    lines.push('如果信息缺失，请用合理的行业默认值，并在“风险与待确认”中标注。')
    lines.push('')
    lines.push('【需求卡片】')
    lines.push(`类型: ${req.type || '未指定'}`)
    lines.push(`输入电源: ${req.inputPower || '未指定'}`)
    lines.push(`目标输出: ${req.outputTarget || '未指定'}`)
    lines.push(`负载特性: ${req.load || '未指定'}`)
    lines.push(`优先级: ${(req.priorities || []).join('、') || '未指定'}`)
    lines.push(`环境/安规: ${req.environment || '未指定'}`)
    lines.push(`元件偏好/禁用: ${req.preferences || '未指定'}`)
    lines.push(`验收标准: ${req.acceptanceCriteria || '未指定'}`)
    lines.push('')
    lines.push('请按标准格式输出各部分，并确保BOM非空。')
    return lines.join('\n')
  }

  const handleGenerateDraft = async () => {
    autoExtractRequirementsFromConversation()
    setSidebarVisible(true)
    const hasAny = Object.values(requirements).some((v) => (Array.isArray(v) ? v.length > 0 : !!v))
    if (!hasAny) {
      message.info('已从最近对话尝试提取信息，请补充关键项后再生成草案。')
      return
    }

    // 生成前更新风险
    const nextRisks: string[] = []
    if (!requirements.inputPower) nextRisks.push('输入电源未明确')
    if (!requirements.outputTarget) nextRisks.push('输出目标未明确')
    if (!requirements.load) nextRisks.push('负载特性未明确')
    if (!requirements.acceptanceCriteria) nextRisks.push('未设置验收标准')
    setRisks(nextRisks)

    const draftPrompt = buildDraftPromptFromRequirements(requirements)
    setInputMessage(draftPrompt)
    await new Promise((r) => setTimeout(r))
    handleSendMessage()
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <RobotOutlined className="text-blue-500 text-lg" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{t('ai_assistant')}</h3>
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
          <Button icon={<DownloadOutlined />} onClick={exportChat} size="small" type="text" title={t('export_chat')} />
          <Button 
            icon={<ClearOutlined />} 
            onClick={clearChat}
            size="small"
            type="text"
            title={t('clear_chat')}
          />
          <Button 
            icon={<SettingOutlined />} 
            onClick={() => setShowSettings(true)}
            size="small"
            type="text"
            title={t('api_settings')}
          />
          <Button 
            onClick={() => { autoExtractRequirementsFromConversation(); setSidebarVisible(true) }}
            size="small"
            type="primary"
          >{t('requirements_card')}</Button>
          <Button 
            onClick={handleGenerateDraft}
            size="small"
          >{t('generate_draft')}</Button>
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
              <span className="text-sm text-gray-600">{t('typing_hint')}</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作 */}
      {messages.length <= 1 && (
        <div className="border-t p-4 bg-white">
          <div className="text-sm text-gray-600 mb-3">💡 {t('quick_start')}：</div>
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
            placeholder={t('input_placeholder')}
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
            {t('generate_draft')}
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

      <RequirementCardSidebar
        visible={sidebarVisible}
        value={requirements}
        onChange={handleRequirementsChange}
        onClose={() => setSidebarVisible(false)}
        onGenerateDraft={handleGenerateDraft}
        risks={risks}
        changes={changes}
      />
    </div>
  )
}

export default ChatPanel