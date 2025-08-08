import { Badge, Tooltip } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'

interface StatusIndicatorProps {
  model: string
  isConfigured: boolean
}

const StatusIndicator = ({ model, isConfigured }: StatusIndicatorProps) => {
  if (isConfigured) {
    return (
      <Tooltip title="API已配置">
        <Badge 
          status="success" 
          text={<span><CheckCircleOutlined style={{ marginRight: 4 }} />{`${model} (已配置)`}</span>}
        />
      </Tooltip>
    )
  }

  return (
    <Tooltip title="使用模拟响应，点击设置按钮配置真实API">
      <Badge 
        status="warning" 
        text={<span><ExclamationCircleOutlined style={{ marginRight: 4 }} />{`${model} (模拟模式)`}</span>}
      />
    </Tooltip>
  )
}

export default StatusIndicator