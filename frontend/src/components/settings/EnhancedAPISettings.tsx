import { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal, Form, Input, Select, Button, message, Space, Card, Alert, Divider, Switch, AutoComplete } from 'antd'
import { SettingOutlined, EyeInvisibleOutlined, EyeTwoTone, CheckOutlined, PlusOutlined } from '@ant-design/icons'
import { aiAPI } from '../../services/api'

const { Option } = Select

interface APIConfig {
  provider: string
  apiKey: string
  apiUrl: string
  model: string
  maxTokens?: number
  temperature?: number
  // 自定义API配置
  requestFormat?: 'openai' | 'claude' | 'custom'
  responseFormat?: 'openai' | 'claude' | 'custom'
  customHeaders?: Record<string, string>
}

interface EnhancedAPISettingsProps {
  visible: boolean
  onClose: () => void
  onSave: (config: APIConfig) => void
}

const EnhancedAPISettings = ({ visible, onClose, onSave }: EnhancedAPISettingsProps) => {
  const [form] = Form.useForm()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customHeaders, setCustomHeaders] = useState<Array<{key: string, value: string}>>([])
  const [currentProvider, setCurrentProvider] = useState<string>('openai')
  const [isConfigured, setIsConfigured] = useState<boolean>(false)

  const providers = useMemo(() => [
    {
      value: 'openai',
      label: 'OpenAI GPT',
      defaultUrl: 'https://api.openai.com/v1',
      keyExample: 'sk-proj-...',
      description: '支持GPT-3.5/4等模型',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo-preview'],
      requestFormat: 'openai',
      responseFormat: 'openai'
    },
    {
      value: 'claude',
      label: 'Anthropic Claude',
      defaultUrl: 'https://api.anthropic.com',
      keyExample: 'sk-ant-...',
      description: '支持Claude-3等模型',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      requestFormat: 'claude',
      responseFormat: 'claude'
    },
    {
      value: 'gemini',
      label: 'Google Gemini',
      defaultUrl: 'https://generativelanguage.googleapis.com/v1beta',
      keyExample: 'AIza...',
      description: '支持Gemini Pro等模型',
      models: ['gemini-pro', 'gemini-pro-vision', 'gemini-2.0-flash', 'Gemini 2.0 Flash'],
      requestFormat: 'custom',
      responseFormat: 'custom'
    },
    {
      value: 'custom',
      label: '自定义API',
      defaultUrl: '',
      keyExample: 'your-api-key',
      description: '支持第三方API或自建服务',
      models: ['你的模型名称', 'deepseek-chat', 'moonshot-v1-8k', 'qwen-turbo'],
      requestFormat: 'openai',
      responseFormat: 'openai'
    },
    {
      value: 'mock',
      label: '模拟API (测试)',
      defaultUrl: 'mock://localhost',
      keyExample: 'test-key',
      description: '用于测试和演示，无需真实API密钥',
      models: ['mock-gpt-4', 'mock-claude', 'mock-gemini'],
      requestFormat: 'openai',
      responseFormat: 'openai'
    },
    {
      value: 'deepseek',
      label: 'DeepSeek (国内)',
      defaultUrl: 'https://api.deepseek.com',
      keyExample: 'sk-xxx',
      description: '深度求索AI，国内可正常访问',
      models: ['deepseek-chat', 'deepseek-coder'],
      requestFormat: 'openai',
      responseFormat: 'openai'
    },
    {
      value: 'moonshot',
      label: 'Moonshot AI (国内)',
      defaultUrl: 'https://api.moonshot.cn',
      keyExample: 'sk-xxx',
      description: '月之暗面AI，国内可正常访问',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
      requestFormat: 'openai',
      responseFormat: 'openai'
    }
  ], [])

  // 为每个提供商使用独立的存储键
  const getConfigKey = (provider: string) => `circuitsai_api_config_${provider}`

  // 加载指定提供商的配置
  const loadProviderConfig = useCallback((provider: string, silent: boolean = false) => {
    try {
      const savedConfig = localStorage.getItem(getConfigKey(provider))
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        if (!silent) console.log(`加载 ${provider} 配置:`, config)
        return config
      }
      
      // 如果没有独立配置，尝试从旧的通用配置中加载
      const oldConfig = localStorage.getItem('circuitsai_api_config')
      if (oldConfig) {
        const config = JSON.parse(oldConfig)
        if (config.provider === provider) {
          // 迁移旧配置到新的独立存储
          localStorage.setItem(getConfigKey(provider), JSON.stringify(config))
          if (!silent) console.log(`迁移旧配置到 ${provider}:`, config)
          return config
        }
      }
    } catch (error) {
      console.error(`Failed to load config for ${provider}:`, error)
    }
    if (!silent) console.log(`${provider} 没有已保存的配置`)
    return null
  }, [])

  // 保存指定提供商的配置
  const saveProviderConfig = (provider: string, config: APIConfig) => {
    try {
      localStorage.setItem(getConfigKey(provider), JSON.stringify(config))
      // 同时更新通用配置（保持向后兼容）
      localStorage.setItem('circuitsai_api_config', JSON.stringify(config))
      console.log(`成功保存 ${provider} 配置到存储:`, {
        key: getConfigKey(provider),
        config: config
      })
    } catch (error) {
      console.error(`Failed to save config for ${provider}:`, error)
    }
  }

  useEffect(() => {
    if (visible) {
      // 加载当前提供商的配置
      const config = loadProviderConfig(currentProvider, true)
      if (config) {
        form.setFieldsValue(config)
        setIsConfigured(true)
        
        // 加载自定义头部
        if (config.customHeaders) {
          const headers = Object.entries(config.customHeaders).map(([key, value]) => ({
            key, value: value as string
          }))
          setCustomHeaders(headers)
        } else {
          setCustomHeaders([])
        }

        // 如果是自定义API，显示高级选项
        setShowAdvanced(config.provider === 'custom')
      } else {
        // 没有保存的配置时，使用默认值
        setIsConfigured(false)
        const selectedProvider = providers.find(p => p.value === currentProvider)
        if (selectedProvider) {
          form.setFieldsValue({
            provider: currentProvider,
            apiUrl: selectedProvider.defaultUrl,
            model: selectedProvider.models[0],
            maxTokens: 2000,
            temperature: 0.7,
            requestFormat: selectedProvider.requestFormat,
            responseFormat: selectedProvider.responseFormat
          })
        }
        setCustomHeaders([])
        setShowAdvanced(currentProvider === 'custom')
      }
      setTestResult(null)
    }
  }, [visible, currentProvider, form, loadProviderConfig, providers])

  const handleProviderChange = (provider: string) => {
    // 先保存当前提供商的配置
    if (currentProvider !== provider) {
      try {
        const currentValues = form.getFieldsValue()
        // 只要有API key就保存，不管其他字段
        if (currentValues.apiKey && currentValues.apiKey.trim()) {
          const currentConfig: APIConfig = {
            ...currentValues,
            provider: currentProvider, // 确保使用正确的provider
            customHeaders: customHeaders.reduce((acc, header) => {
              if (header.key && header.value) {
                acc[header.key] = header.value
              }
              return acc
            }, {} as Record<string, string>)
          }
          saveProviderConfig(currentProvider, currentConfig)
          console.log(`已保存 ${currentProvider} 的配置:`, currentConfig)
        }
      } catch (error) {
        console.warn('Failed to save current config:', error)
      }
    }

    // 切换到新提供商
    setCurrentProvider(provider)
    
    // 加载新提供商的配置
    const config = loadProviderConfig(provider, true)
    const selectedProvider = providers.find(p => p.value === provider)
    
    if (config) {
      // 有保存的配置，直接加载
      setIsConfigured(true)
      form.setFieldsValue(config)
      if (config.customHeaders) {
        const headers = Object.entries(config.customHeaders).map(([key, value]) => ({
          key, value: value as string
        }))
        setCustomHeaders(headers)
      } else {
        setCustomHeaders([])
      }
      setShowAdvanced(config.provider === 'custom')
    } else if (selectedProvider) {
      // 没有保存的配置，使用默认值
      setIsConfigured(false)
      form.setFieldsValue({
        provider: provider,
        apiUrl: selectedProvider.defaultUrl,
        model: selectedProvider.models[0],
        maxTokens: 2000,
        temperature: 0.7,
        requestFormat: selectedProvider.requestFormat,
        responseFormat: selectedProvider.responseFormat,
        apiKey: '' // 清空API密钥
      })
      setCustomHeaders([])
      setShowAdvanced(provider === 'custom')
    }
    
    setTestResult(null)
  }

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }])
  }

  const removeCustomHeader = (index: number) => {
    const newHeaders = customHeaders.filter((_, i) => i !== index)
    setCustomHeaders(newHeaders)
  }

  const updateCustomHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...customHeaders]
    newHeaders[index][field] = value
    setCustomHeaders(newHeaders)
  }

  const testConnection = async () => {
    try {
      const values = await form.validateFields()
      setTesting(true)
      setTestResult(null)

      // 构建完整配置
      const config: APIConfig = {
        ...values,
        customHeaders: customHeaders.reduce((acc, header) => {
          if (header.key && header.value) {
            acc[header.key] = header.value
          }
          return acc
        }, {} as Record<string, string>)
      }

      // 调用测试接口（通过 aiAPI 转发到 Workers，避免 Pages 405）
      console.log('发送测试请求:', config)
      const result = await aiAPI.testApiConfig(config as any)
      console.log('测试结果:', result)
      
      if (result && result.success) {
        setTestResult({
          success: true,
          message: result.message || 'API连接测试成功！'
        })
      } else {
        setTestResult({
          success: false,
          message: (result && result.error) || 'API连接测试失败'
        })
      }
    } catch (error) {
      console.error('测试连接失败:', error)
      setTestResult({
        success: false,
        message: '测试失败，请检查网络连接和配置'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      // 构建完整配置
      const config: APIConfig = {
        ...values,
        customHeaders: customHeaders.reduce((acc, header) => {
          if (header.key && header.value) {
            acc[header.key] = header.value
          }
          return acc
        }, {} as Record<string, string>)
      }
      
      // 保存到对应提供商的独立存储
      saveProviderConfig(config.provider, config)
      setIsConfigured(true)
      console.log(`保存配置成功:`, config)
      
      // 调用父组件回调
      onSave(config)
      
      message.success(`${getCurrentProvider()?.label} API配置已保存`)
      onClose()
    } catch (error) {
      console.error('Save failed:', error)
      message.error('保存失败，请检查配置')
    }
  }

  // 处理对话框关闭时的配置保存
  const handleClose = () => {
    // 在关闭时保存当前配置（如果有效）
    try {
      const values = form.getFieldsValue()
      if (values.apiKey && values.apiKey.trim()) {
        const config: APIConfig = {
          ...values,
          customHeaders: customHeaders.reduce((acc, header) => {
            if (header.key && header.value) {
              acc[header.key] = header.value
            }
            return acc
          }, {} as Record<string, string>)
        }
        saveProviderConfig(config.provider, config)
      }
    } catch (error) {
      console.warn('Failed to save config on close:', error)
    }
    onClose()
  }

  const getCurrentProvider = () => {
    return providers.find(p => p.value === currentProvider)
  }

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          AI API配置
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button key="test" onClick={testConnection} loading={testing}>
          测试连接
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存配置
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          provider: 'openai',
          apiUrl: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo',
          maxTokens: 2000,
          temperature: 0.7,
          requestFormat: 'openai',
          responseFormat: 'openai'
        }}
      >
        <Alert
          message="AI API配置"
          description="每个AI提供商的配置独立保存，您可以为不同的提供商配置不同的API密钥和参数。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          label="AI提供商"
          name="provider"
          rules={[{ required: true, message: '请选择AI提供商' }]}
        >
          <Select value={currentProvider} onChange={handleProviderChange} placeholder="选择AI提供商">
            {providers.map(provider => (
              <Option key={provider.value} value={provider.value}>
                <div>
                  <div>{provider.label}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {provider.description}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="API密钥"
          name="apiKey"
          rules={[
            { required: true, message: '请输入API密钥' },
            { min: 10, message: 'API密钥长度至少10位' }
          ]}
        >
          <Input.Password
            placeholder={`请输入${getCurrentProvider()?.label || 'API'}密钥`}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          label="API地址"
          name="apiUrl"
          rules={[
            { required: true, message: '请输入API地址' },
            { type: 'url', message: '请输入有效的URL地址' }
          ]}
        >
          <Input placeholder="API地址" />
        </Form.Item>

        <Form.Item
          label="模型名称"
          name="model"
          rules={[{ required: true, message: '请输入模型名称' }]}
          extra="可以输入任意模型名称，支持自动补全"
        >
          <AutoComplete
            placeholder="输入模型名称，如：gpt-4, claude-3-5-sonnet-20241022"
            allowClear
            options={getCurrentProvider()?.models.map(model => ({ value: model, label: model })) || []}
            filterOption={(inputValue, option) => {
              const ov = typeof option?.value === 'string' ? option.value : String(option?.value ?? '')
              const iv = typeof inputValue === 'string' ? inputValue : String(inputValue ?? '')
              return ov.toLowerCase().includes(iv.toLowerCase())
            }}
          />
        </Form.Item>

        <Divider>
          <Space>
            高级选项
            <Switch checked={showAdvanced} onChange={setShowAdvanced} />
          </Space>
        </Divider>

        {showAdvanced && (
          <>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Form.Item
                label="最大令牌数"
                name="maxTokens"
                style={{ flex: 1 }}
              >
                <Input type="number" placeholder="2000" />
              </Form.Item>

              <Form.Item
                label="温度参数"
                name="temperature"
                style={{ flex: 1 }}
              >
                <Input type="number" step="0.1" placeholder="0.7" />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <Form.Item
                label="请求格式"
                name="requestFormat"
                style={{ flex: 1 }}
              >
                <Select>
                  <Option value="openai">OpenAI格式</Option>
                  <Option value="claude">Claude格式</Option>
                  <Option value="custom">自定义格式</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="响应格式"
                name="responseFormat"
                style={{ flex: 1 }}
              >
                <Select>
                  <Option value="openai">OpenAI格式</Option>
                  <Option value="claude">Claude格式</Option>
                  <Option value="custom">自定义格式</Option>
                </Select>
              </Form.Item>
            </div>

            <div>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>自定义请求头</span>
                <Button icon={<PlusOutlined />} onClick={addCustomHeader} size="small">
                  添加
                </Button>
              </div>
              {customHeaders.map((header, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <Input
                    placeholder="Header名称"
                    value={header.key}
                    onChange={(e) => updateCustomHeader(index, 'key', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Input
                    placeholder="Header值"
                    value={header.value}
                    onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button onClick={() => removeCustomHeader(index)} size="small">
                    删除
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {getCurrentProvider() && (
          <Card size="small" style={{ backgroundColor: '#f9f9f9', marginTop: 16 }}>
            <h4>配置说明：</h4>
            <p><strong>提供商：</strong>{getCurrentProvider()?.label}</p>
            <p><strong>密钥格式：</strong>{getCurrentProvider()?.keyExample}</p>
            <p><strong>说明：</strong>{getCurrentProvider()?.description}</p>
            <p><strong>配置状态：</strong>
              <span style={{ color: isConfigured ? '#52c41a' : '#ff4d4f' }}>
                {isConfigured ? '已配置' : '未配置'}
              </span>
            </p>
          </Card>
        )}

        {testResult && (
          <Alert
            message={testResult.success ? '连接成功' : '连接失败'}
            description={testResult.message}
            type={testResult.success ? 'success' : 'error'}
            showIcon
            icon={testResult.success ? <CheckOutlined /> : undefined}
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Modal>
  )
}

export default EnhancedAPISettings