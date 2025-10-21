import React, { useMemo } from 'react'
import { Drawer, Form, Input, Select, Button, Divider, Space, Tag, List } from 'antd'
import { useI18n } from '../../i18n/I18nProvider'

export interface Requirements {
  type: string
  inputPower: string
  outputTarget: string
  load: string
  priorities: string[]
  environment: string
  preferences: string
  acceptanceCriteria: string
}

interface RequirementCardSidebarProps {
  visible: boolean
  value: Requirements
  onChange: (next: Requirements) => void
  onClose: () => void
  onGenerateDraft: () => void
  risks?: string[]
  changes?: string[]
}

const priorityOptions = [
  { label: '成本', value: '成本' },
  { label: '体积', value: '体积' },
  { label: '效率', value: '效率' },
  { label: '噪声', value: '噪声' },
  { label: '精度', value: '精度' }
]

const RequirementCardSidebar: React.FC<RequirementCardSidebarProps> = ({ visible, value, onChange, onClose, onGenerateDraft, risks = [], changes = [] }) => {
  const [form] = Form.useForm<Requirements>()
  const { t } = useI18n()

  const handleValuesChange = (_: Partial<Requirements>, allValues: Requirements) => {
    onChange(allValues)
  }

  const suggestions = useMemo(() => {
    const next: string[] = []
    if (!value.type) next.push('你要做哪类电路？例如：电源稳压/LED驱动/放大器/音频功放')
    if (!value.inputPower) next.push('输入电源是多少？例如：5V/12V/电池3.7V（范围也可以）')
    if (!value.outputTarget) next.push('目标输出是什么？例如：恒压5V/恒流10mA/增益20dB')
    if (!value.load) next.push('负载是什么？例如：单颗LED/8Ω喇叭/传感器输入，典型参数是多少？')
    if (!value.priorities || value.priorities.length === 0) next.push('以下哪个更重要：成本/体积/效率/噪声/精度（选1-2项）')
    if (!value.environment) next.push('工作环境与安规要求？例如：室内/户外/EMC/是否电池设备')
    if (!value.preferences) next.push('元件偏好或禁用？例如：贴片0805/禁用某型号/偏好常见货源')
    if (!value.acceptanceCriteria) next.push('验收标准是？例如：纹波≤X、效率≥Y、成本≤Z')
    return next.slice(0, 5)
  }, [value])

  return (
    <Drawer
      title={t('req_card_title')}
      placement="right"
      width={420}
      onClose={onClose}
      open={visible}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={() => form.resetFields()}>{t('reset')}</Button>
          <Button type="primary" onClick={onGenerateDraft}>{t('generate_draft')}</Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={value}
        onValuesChange={handleValuesChange}
      >
        <Form.Item label={t('field_circuit_type')} name="type">
          <Input placeholder="例如：LED驱动 / 电源稳压 / 放大器" />
        </Form.Item>

        <Form.Item label={t('field_input_power')} name="inputPower">
          <Input placeholder="例如：5V / 12V / 电池3.7V" />
        </Form.Item>

        <Form.Item label={t('field_output_target')} name="outputTarget">
          <Input placeholder="例如：恒流10mA / 恒压5V / 增益20dB" />
        </Form.Item>

        <Form.Item label={t('field_load')} name="load">
          <Input placeholder="例如：单颗LED / 扬声器8Ω / 传感器输入" />
        </Form.Item>

        <Form.Item label={t('field_priorities')} name="priorities">
          <Select mode="multiple" options={priorityOptions} placeholder="选择最重要的1-2项" />
        </Form.Item>

        <Form.Item label={t('field_environment')} name="environment">
          <Input.TextArea rows={2} placeholder="例如：室温/户外/EMC要求/电池设备" />
        </Form.Item>

        <Form.Item label={t('field_preferences')} name="preferences">
          <Input.TextArea rows={2} placeholder="例如：优先贴片0805、禁用某型号等" />
        </Form.Item>

        <Divider />

        <Form.Item label={t('field_acceptance_criteria')} name="acceptanceCriteria">
          <Input.TextArea rows={3} placeholder="例如：纹波≤X，效率≥Y，成本≤Z" />
        </Form.Item>
      </Form>

      <Divider />
      <div className="text-xs text-gray-500">
        <span>{t('confirmed_items')}：</span>
        <Space size={[4, 8]} wrap>
          {Object.entries(value).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v)).map(([k]) => (
            <Tag key={k} color="blue">{k}</Tag>
          ))}
        </Space>
      </div>

      <Divider />
      <div>
        <div className="text-sm text-gray-700 mb-2">{t('suggestions_title')}</div>
        <List
          size="small"
          dataSource={suggestions}
          locale={{ emptyText: '看起来信息比较完整，可以直接生成草案。' }}
          renderItem={(item) => <List.Item style={{ padding: '4px 0' }}>• {item}</List.Item>}
        />
      </div>

      <Divider />
      <div>
        <div className="text-sm text-gray-700 mb-2">{t('risks_title')}</div>
        <List
          size="small"
          dataSource={risks}
          locale={{ emptyText: '暂无显著风险。' }}
          renderItem={(item) => <List.Item style={{ padding: '4px 0' }}>• {item}</List.Item>}
        />
      </div>

      <Divider />
      <div>
        <div className="text-sm text-gray-700 mb-2">{t('changes_title')}</div>
        <List
          size="small"
          dataSource={changes}
          locale={{ emptyText: '暂无变更记录。' }}
          renderItem={(item) => <List.Item style={{ padding: '4px 0' }}>• {item}</List.Item>}
        />
      </div>
    </Drawer>
  )
}

export default RequirementCardSidebar
