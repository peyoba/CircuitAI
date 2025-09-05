import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { Input, Button, Avatar, message, Spin, Select } from 'antd'
import { SendOutlined, UserOutlined, RobotOutlined, ClearOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons'
import { ChatMessage } from '../../../../shared/src/types/index'
import { aiAPI } from '../../services/api'
import StatusIndicator from '../common/StatusIndicator'
import RequirementCardSidebar, { Requirements } from './RequirementCardSidebar'
import { useI18n } from '../../i18n/I18nProvider'
import { getActiveAPIConfig, getActualAPIConfig, saveUserAPIConfig, DefaultAPIConfig } from '../../config/defaultAPI'

// 懒加载设置组件
const EnhancedAPISettings = lazy(() => import('../settings/EnhancedAPISettings'))

const { TextArea } = Input

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
  const { t } = useI18n()
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1', role: 'assistant', content: '', timestamp: new Date()
  }])
  useEffect(() => {
    // 初始化首条欢迎语（依赖语言）
    setMessages([{ id: '1', role: 'assistant', content: t('assistant_welcome'), timestamp: new Date() }])
  }, [t])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('deepseek')
  const [showSettings, setShowSettings] = useState(false)
  const [apiConfigured, setApiConfigured] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [thinkingProgress, setThinkingProgress] = useState(0) // 新增：思考进度
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]) // 新增：思考步骤数组
  const [currentThinkingIndex, setCurrentThinkingIndex] = useState(0) // 新增：当前思考步骤索引
  const [quickActions, setQuickActions] = useState<string[]>([])
  useEffect(() => {
    setQuickActions([
      t('quick_action_5v_regulator'),
      t('quick_action_led_blink'),
      t('quick_action_opamp_amplifier'),
      t('quick_action_audio_amp')
    ])
  }, [t])
  const [currentApiConfig, setCurrentApiConfig] = useState<DefaultAPIConfig | null>(null)
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
    } catch (error) {
      console.warn('Failed to load requirements:', error)
    }
  }, [])

  useEffect(() => {
    // 加载API配置 - 优先使用默认配置
    const config = getActiveAPIConfig()
    console.log('加载的API配置:', config)
    setCurrentApiConfig(config)
    setApiConfigured(true) // 默认配置总是可用的
    setSelectedProvider(config.provider)
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
    try {
      localStorage.setItem('circuitsai_requirements', JSON.stringify(requirements))
    } catch (error) {
      console.warn('Failed to save requirements:', error)
    }
  }, [requirements])
  useEffect(() => {
    try {
      localStorage.setItem('circuitsai_requirements_risks', JSON.stringify(risks))
    } catch (error) {
      console.warn('Failed to save risks:', error)
    }
  }, [risks])
  useEffect(() => {
    try {
      localStorage.setItem('circuitsai_requirements_changes', JSON.stringify(changes))
    } catch (error) {
      console.warn('Failed to save changes:', error)
    }
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
      const newVal = extracted[key]
      if (newVal && next[key] !== newVal) {
        const oldVal = next[key] || '未设置'
        changesList.push(`${key}: ${oldVal} -> ${newVal}`)
        next[key] = newVal
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
      if (prev[key] !== next[key]) {
        const oldVal = prev[key] || '未设置'
        const newVal = next[key] || '未设置'
        diffs.push(`${key}: ${oldVal} -> ${newVal}`)
      }
    })
    if (JSON.stringify(prev.priorities) !== JSON.stringify(next.priorities)) {
      diffs.push(`priorities: ${(prev.priorities||[]).join('、')||'未设置'} -> ${(next.priorities||[]).join('、')||'未设置'}`)
    }
    if (diffs.length) setChanges(prevChanges => [...prevChanges, ...diffs])

    setRequirements(next)
  }

  // 解析AI返回内容中的思考过程
  const parseThinkingProcess = (content: string): { thinking: string[], mainContent: string } => {
    // 确保 content 是字符串类型
    if (!content || typeof content !== 'string') {
      return { thinking: [], mainContent: content || '' }
    }
    
    const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i)
    if (!thinkingMatch) {
      return { thinking: [], mainContent: content }
    }
    
    const thinkingText = thinkingMatch[1]?.trim() || ''
    const thinking = thinkingText
      .split(/\d+\.\s*/)
      .filter(step => step.trim())
      .map(step => step.trim())
    
    const mainContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim()
    return { thinking, mainContent }
  }

  // 分步显示思考过程
  const displayThinkingSteps = async (steps: string[]): Promise<void> => {
    setThinkingSteps(steps)
    setCurrentThinkingIndex(0)
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentThinkingIndex(i)
      setThinkingProgress((i + 1) / steps.length * 100)
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))
    }
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
      
      // 获取实际的API配置（处理默认配置映射）
      const actualConfig = currentApiConfig ? getActualAPIConfig(currentApiConfig) : undefined
      
      // 转换为 APIConfig 格式
      const apiConfig = actualConfig ? {
        provider: actualConfig.provider,
        model: actualConfig.model,
        apiKey: actualConfig.apiKey,
        apiUrl: actualConfig.apiUrl,
        temperature: actualConfig.temperature,
        maxTokens: actualConfig.maxTokens,
        requestFormat: actualConfig.requestFormat,
        responseFormat: actualConfig.responseFormat,
        customHeaders: actualConfig.customHeaders
      } : undefined
      
      const response = await aiAPI.chat({
        message: userMessage.content,
        conversationId: conversationId.current,
        provider: apiConfig?.provider || selectedProvider,
        apiConfig: apiConfig || undefined
      })

      // 更新会话ID
      if (response.data?.conversationId) {
        conversationId.current = response.data.conversationId
      }
      
      // 解析AI返回的内容，提取思考过程
      const responseContent = response?.data?.response || ''
      const { thinking, mainContent } = parseThinkingProcess(responseContent)
      
      // 如果有思考过程，先显示思考步骤
      if (thinking.length > 0) {
        await displayThinkingSteps(thinking)
      }
      
      // 清除思考状态，开始显示最终答案
      setThinkingProgress(0)
      setThinkingSteps([])
      setCurrentThinkingIndex(0)
      setIsTyping(true)
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mainContent || responseContent, // 使用解析后的内容或原内容
        timestamp: new Date()
      }

      // 添加短暂延迟模拟打字效果
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage])
        setIsTyping(false)
        updateRequirementsFromAssistant(responseContent)
      }, 500)

      // 检查是否包含电路图或BOM数据，添加调试日志
      console.log('检查响应数据:', {
        hasCircuitData: !!response.data?.circuit_data,
        hasBomData: !!response.data?.bom_data,
        circuitComponents: response.data?.circuit_data?.components?.length || 0,
        bomItems: response.data?.bom_data?.items?.length || 0
      })
      
      if (response.data?.circuit_data && onCircuitGenerated) {
        console.log('传递电路数据到父组件:', response.data.circuit_data)
        onCircuitGenerated(response.data.circuit_data)
      }
      if (response.data?.bom_data && onBomGenerated) {
        console.log('传递BOM数据到父组件:', response.data.bom_data)
        onBomGenerated(response.data.bom_data)
      }

    } catch (error: unknown) {
      console.error('发送消息失败:', error)
      
      // 清除思考状态
      setThinkingProgress(0)
      setThinkingSteps([])
      setCurrentThinkingIndex(0)
      setIsTyping(false)
      
      let errorContent = '抱歉，我现在无法回复。'
      let shouldShowApiSettings = false
      
      // 根据错误类型提供更具体的错误信息
      if (error instanceof Error) {
        const errorMessage = error.message
        
        if (errorMessage.includes('AI响应超时')) {
          errorContent = '⏱️ AI响应超时，可能是网络较慢或AI服务繁忙，请稍后重试。'
        } else if (errorMessage.includes('AI服务暂时不可用')) {
          errorContent = '🔧 AI服务暂时不可用，请检查API配置或稍后重试。'
          shouldShowApiSettings = true
        } else if (errorMessage.includes('请求过于频繁')) {
          errorContent = '⏳ 请求过于频繁，请等待片刻后再试。'
        } else if (errorMessage.includes('网络连接失败')) {
          errorContent = '🌐 网络连接失败，请检查网络连接后重试。'
        } else {
          errorContent = `❌ ${errorMessage}`
        }
      } else {
        // 处理传统的错误对象
        const err = error as { 
          response?: { status?: number; data?: { error?: string } }; 
          code?: string; 
          message?: string 
        }
        
        if (err?.response?.status === 401) {
          errorContent = '❌ API密钥无效或未配置，请在设置中检查您的AI服务配置。'
          shouldShowApiSettings = true
        } else if (err?.response?.status === 429) {
          errorContent = '⏳ API请求频率过高，请稍等片刻后再试。'
        } else if (err?.response?.status === 503) {
          errorContent = '🔌 AI服务连接失败，请检查网络连接或API地址配置。'
          shouldShowApiSettings = true
        } else if (err?.code === 'ECONNABORTED') {
          errorContent = '⏱️ 请求超时，AI服务响应时间过长，请稍后重试。'
        } else if (err?.message?.includes('Network Error')) {
          errorContent = '🌐 网络连接错误，请检查您的网络连接。'
        } else if (err?.response?.data?.error) {
          errorContent = `❌ ${err.response.data.error}`
        }
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
      
      // 如果需要，自动打开API设置
      if (shouldShowApiSettings && !apiConfigured) {
        setTimeout(() => {
          setShowSettings(true)
        }, 1000)
      }
    } finally {
      setIsLoading(false)
      setThinkingProgress(0)
      setThinkingSteps([])
      setCurrentThinkingIndex(0)
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
    
    const fullConfig: DefaultAPIConfig = {
      ...config,
      displayName: config.provider === 'default' ? '智能AI助手' : `${config.provider} - ${config.model}`,
      description: config.provider === 'default' ? '系统内置AI，无需配置即可使用' : '用户自定义配置',
      isDefault: config.provider === 'default',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7
    }
    
    // 使用默认配置系统保存
    saveUserAPIConfig(fullConfig)
    
    setCurrentApiConfig(fullConfig)
    setSelectedProvider(config.provider)
    setApiConfigured(true) // 任何配置都是有效的
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
      {/* 头部（两行布局，避免窄侧栏拥挤换行） */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <RobotOutlined className="text-blue-500 text-lg flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-800 truncate">{t('ai_assistant')}</h3>
              <StatusIndicator 
                model={availableProviders.find(p => p.value === selectedProvider)?.label || selectedProvider}
                isConfigured={apiConfigured}
              />
            </div>
          </div>
          <div className="flex items-center">
            <Select
              value={selectedProvider}
              onChange={setSelectedProvider}
              size="small"
              style={{ minWidth: 160 }}
              options={availableProviders.map(p => ({ value: p.value, label: `${p.icon} ${p.label}` }))}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
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
            <div className="bg-gray-100 p-3 rounded-lg min-w-[200px] max-w-[80%]">
              {thinkingSteps.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    🤔 AI思考过程：
                  </div>
                  
                  {/* 显示所有思考步骤 */}
                  {thinkingSteps.map((step, index) => (
                    <div 
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded ${
                        index < currentThinkingIndex 
                          ? 'bg-green-50 border border-green-200' 
                          : index === currentThinkingIndex 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-gray-50 opacity-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        index < currentThinkingIndex 
                          ? 'bg-green-500 text-white' 
                          : index === currentThinkingIndex 
                          ? 'bg-blue-500 text-white animate-pulse' 
                          : 'bg-gray-300 text-gray-500'
                      }`}>
                        {index < currentThinkingIndex ? '✓' : index + 1}
                      </div>
                      <div className={`text-sm flex-1 ${
                        index <= currentThinkingIndex ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        {step}
                        {index === currentThinkingIndex && (
                          <Spin size="small" className="ml-2" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* 进度条 */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${thinkingProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      思考中... {Math.round(thinkingProgress)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Spin size="small" />
                  <span className="text-sm text-gray-700">正在分析您的需求...</span>
                </div>
              )}
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
            {t('send')}
          </Button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>

      {/* API设置弹窗 */}
      {showSettings && (
        <Suspense fallback={<Spin size="large" />}>
          <EnhancedAPISettings
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            onSave={handleAPIConfig}
          />
        </Suspense>
      )}

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