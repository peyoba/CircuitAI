import { Badge, Tooltip } from 'antd'
import { useI18n } from '../../i18n/I18nProvider'
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'

interface StatusIndicatorProps {
  model: string
  isConfigured: boolean
}

const StatusIndicator = ({ model, isConfigured }: StatusIndicatorProps) => {
  const { t } = useI18n()
  if (isConfigured) {
    return (
      <Tooltip title={t('settings_title')}>
        <Badge 
          status="success" 
          text={<span><CheckCircleOutlined style={{ marginRight: 4 }} />{`${model} (Configured)`}</span>}
        />
      </Tooltip>
    )
  }

  return (
    <Tooltip title={t('api_settings')}>
      <Badge 
        status="warning" 
        text={<span><ExclamationCircleOutlined style={{ marginRight: 4 }} />{`${model} (Mock)`}</span>}
      />
    </Tooltip>
  )
}

export default StatusIndicator