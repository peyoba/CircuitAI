import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, message, Space, Card, Alert, AutoComplete } from 'antd'
import { SettingOutlined, EyeInvisibleOutlined, EyeTwoTone, CheckOutlined } from '@ant-design/icons'

const { Option } = Select

interface APIConfig {
  provider: string
  model: string
  apiKey: string
  apiUrl?: string
}

interface APISettingsProps {
  visible: boolean
  onClose: () => void
  onSave: (config: APIConfig) => void
}

const APISettings = ({ visible, onClose, onSave }: APISettingsProps) => {
  const [form] = Form.useForm()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null)

  const providers = [
    {
      value: 'openai',
      label: 'OpenAI',
      defaultUrl: 'https://api.openai.com/v1',
      keyExample: 'sk-...',
      modelExamples: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      description: '支持GPT系列模型'
    },
    {
      value: 'claude',
      label: 'Anthropic Claude',
      defaultUrl: 'https://api.anthropic.com',
      keyExample: 'sk-ant-...',
      modelExamples: ['claude-3-5-sonnet-20241022', 'claude-3-haiku', 'claude-3-opus'],
      description: '支持Claude系列模型'
    },
    {
      value: 'gemini',
      label: 'Google Gemini',
      defaultUrl: 'https://generativelanguage.googleapis.com',
      keyExample: 'AIza...',
      modelExamples: ['gemini-pro', 'gemini-pro-vision'],
      description: '支持Gemini系列模型'
    },
    {
      value: 'custom',
      label: '自定义API',
      defaultUrl: '',
      keyExample: '自定义密钥格式',
      modelExamples: ['自定义模型名称'],
      description: '支持任意兼容OpenAI格式的API'
    }
  ]

  useEffect(() => {
    if (visible) {
      // 加载保存的配置
      const savedConfig = localStorage.getItem('circuitsai_api_config')
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig)
          form.setFieldsValue(config)
        } catch (error) {
          console.error('Failed to load API config:', error)
        }
      }
    }
  }, [visible, form])

  const handleProviderChange = (provider: string) => {
    const selectedProvider = providers.find(p => p.value === provider)
    if (selectedProvider) {
      const currentModel = form.getFieldValue('model')
      // 只在模型为空时设置默认模型，否则保留用户输入
      const updates: {
        apiUrl: string
        model?: string
      } = {
        apiUrl: selectedProvider.defaultUrl
      }
      if (!currentModel) {
        updates.model = selectedProvider.modelExamples[0]
      }
      form.setFieldsValue(updates)
    }
    setTestResult(null)
  }

  const testConnection = async () => {
    try {
      const values = await form.validateFields()
      setTesting(true)
      setTestResult(null)

      // 调用后端API测试接口
      const response = await fetch('/api/ai/test-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: values.provider,
          model: values.model,
          apiKey: values.apiKey,
          apiUrl: values.apiUrl
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setTestResult({
          success: true,
          message: `连接成功！模型：${values.model}`
        })
      } else {
        setTestResult({
          success: false,
          message: result.message || 'API连接失败'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: '测试失败，请检查网络连接'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      // 保存到localStorage
      localStorage.setItem('circuitsai_api_config', JSON.stringify(values))
      
      // 调用父组件回调
      onSave(values)
      
      message.success('API配置已保存')
      onClose()
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  const getCurrentProvider = () => {
    const providerValue = form.getFieldValue('provider')
    return providers.find(p => p.value === providerValue)
  }

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          AI模型配置
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
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
          model: 'gpt-4',
          apiUrl: 'https://api.openai.com/v1'
        }}
      >
        <Alert
          message="配置AI模型"
          description="选择并配置您要使用的AI模型。如果不配置，系统将使用内置的模拟响应。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          label="API提供商"
          name="provider"
          rules={[{ required: true, message: '请选择API提供商' }]}
        >
          <Select onChange={handleProviderChange} placeholder="选择API提供商">
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
          label="模型名称"
          name="model"
          rules={[{ required: true, message: '请输入模型名称' }]}
          extra="可以输入任意模型名称，支持自动补全"
        >
          <AutoComplete
            placeholder="输入模型名称，如：gpt-4"
            allowClear
            options={getCurrentProvider()?.modelExamples.map(model => ({ value: model, label: model })) || []}
            filterOption={(inputValue, option) =>
              option?.value.toLowerCase().includes(inputValue.toLowerCase()) || false
            }
          />
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

        {getCurrentProvider() && (
          <Card size="small" style={{ backgroundColor: '#f9f9f9' }}>
            <h4>配置说明：</h4>
            <p><strong>提供商：</strong>{getCurrentProvider()?.label}</p>
            <p><strong>密钥格式：</strong>{getCurrentProvider()?.keyExample}</p>
            <p><strong>常用模型：</strong>{getCurrentProvider()?.modelExamples.join(', ')}</p>
            <p><strong>说明：</strong>{getCurrentProvider()?.description}</p>
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

export default APISettings