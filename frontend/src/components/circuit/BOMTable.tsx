import { useState } from 'react'
import { Card, Table, Button, Space, Tag, message, InputNumber, Input } from 'antd'
import { DownloadOutlined, ShoppingCartOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useI18n } from '../../i18n/I18nProvider'

interface BOMItem {
  id: string
  reference: string[]
  component: string
  value: string
  package?: string
  quantity: number
  manufacturer?: string
  partNumber?: string
  supplier?: string
  price?: number
  description?: string
}

interface BOMTableProps {
  bomData?: BOMItem[]
  loading?: boolean
  editable?: boolean
}

const BOMTable = ({ bomData = [], loading = false, editable = false }: BOMTableProps) => {
  const { t } = useI18n()
  const [data] = useState<BOMItem[]>(bomData)
  const [editingKey, setEditingKey] = useState('')
  const [showSummary, setShowSummary] = useState(true)
  const [groupByType, setGroupByType] = useState(false)

  const isEditing = (record: BOMItem) => record.id === editingKey

  const edit = (record: BOMItem) => {
    setEditingKey(record.id)
  }

  const cancel = () => {
    setEditingKey('')
  }

  const save = async () => {
    setEditingKey('')
    message.success(t('saved_success'))
  }

  const exportToCsv = () => {
    if (data.length === 0) {
      message.warning(t('no_data_to_export'))
      return
    }

    const headers = ['序号', '标号', '元件名称', '参数值', '封装', '数量', '制造商', '型号', '供应商', '单价', '小计', '描述']
    const csvContent = [
      headers.join(','),
      ...data.map((item, index) => [
        index + 1,
        `"${item.reference.join(', ')}"`,
        `"${item.component}"`,
        `"${item.value}"`,
        `"${item.package || ''}"`,
        item.quantity,
        `"${item.manufacturer || ''}"`,
        `"${item.partNumber || ''}"`,
        `"${item.supplier || ''}"`,
        item.price || 0,
        (item.price || 0) * item.quantity,
        `"${item.description || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BOM_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success(t('exported_bom_csv'))
  }

  const exportToPdf = () => {
    // TODO: 实现PDF导出功能
    message.info(t('pdf_export_wip'))
  }

  const openPurchaseLink = (item: BOMItem) => {
    // TODO: 集成采购链接
    message.info(t('purchasing_lookup', { name: item.component }))
  }

  const calculateTotal = () => {
    return data.reduce((total, item) => total + (item.price || 0) * item.quantity, 0)
  }

  const getComponentStats = () => {
    const stats: { [key: string]: number } = {}
    data.forEach(item => {
      const type = getComponentType(item.component)
      stats[type] = (stats[type] || 0) + item.quantity
    })
    return stats
  }

  const getComponentType = (component: string) => {
    const lower = component.toLowerCase()
    if (lower.includes('电阻') || lower.includes('resistor')) return '电阻'
    if (lower.includes('电容') || lower.includes('capacitor')) return '电容'
    if (lower.includes('电感') || lower.includes('inductor')) return '电感'
    if (lower.includes('二极管') || lower.includes('diode')) return '二极管'
    if (lower.includes('晶体管') || lower.includes('transistor')) return '晶体管'
    if (lower.includes('集成电路') || lower.includes('ic') || lower.includes('芯片')) return '集成电路'
    return '其他'
  }

  const renderSummaryCard = () => {
    if (!showSummary || data.length === 0) return null
    
    const stats = getComponentStats()
    const totalCost = calculateTotal()
    const totalComponents = data.reduce((sum, item) => sum + item.quantity, 0)
    
    return (
      <Card className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.length}</div>
            <div className="text-sm text-gray-500">{t('kinds_of_components')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalComponents}</div>
            <div className="text-sm text-gray-500">{t('total_quantity')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">¥{totalCost.toFixed(2)}</div>
            <div className="text-sm text-gray-500">{t('estimated_cost')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{Object.keys(stats).length}</div>
            <div className="text-sm text-gray-500">{t('component_categories')}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).map(([type, count]) => (
              <Tag key={type} color="geekblue" className="mb-1">
                {type}: {count}
              </Tag>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  const columns: ColumnsType<BOMItem> = [
    {
      title: t('table_index'),
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: t('table_ref'),
      dataIndex: 'reference',
      key: 'reference',
      width: 120,
      render: (references: string[]) => (
        <div className="flex flex-wrap gap-1">
          {references.map((ref, index) => (
            <Tag key={index} color="blue" className="text-xs">
              {ref}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: t('table_component'),
      dataIndex: 'component',
      key: 'component',
      width: 120,
      render: (text, record) => (
        <div>
          <div className="font-semibold">{text}</div>
          {record.description && (
            <div className="text-xs text-gray-500">{record.description}</div>
          )}
        </div>
      )
    },
    {
      title: t('table_value'),
      dataIndex: 'value',
      key: 'value',
      width: 100,
      render: (text) => (
        <span className="font-mono text-blue-600">{text}</span>
      )
    },
    {
      title: t('table_package'),
      dataIndex: 'package',
      key: 'package',
      width: 80
    },
    {
      title: t('table_qty'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (text, record) => {
        const editing = isEditing(record)
        return editing ? (
          <InputNumber
            min={1}
            defaultValue={text}
            size="small"
            style={{ width: '100%' }}
          />
        ) : (
          <span className="font-semibold">{text}</span>
        )
      }
    },
    {
      title: t('table_manufacturer'),
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 100,
      render: (text, record) => {
        const editing = isEditing(record)
        return editing ? (
          <Input
            defaultValue={text}
            size="small"
            placeholder="制造商"
          />
        ) : (
          <span>{text || '-'}</span>
        )
      }
    },
    {
      title: t('table_partnumber'),
      dataIndex: 'partNumber',
      key: 'partNumber',
      width: 120,
      render: (text, record) => {
        const editing = isEditing(record)
        return editing ? (
          <Input
            defaultValue={text}
            size="small"
            placeholder="型号"
          />
        ) : (
          <span className="font-mono">{text || '-'}</span>
        )
      }
    },
    {
      title: t('table_supplier'),
      dataIndex: 'supplier',
      key: 'supplier',
      width: 100
    },
    {
      title: t('table_price'),
      dataIndex: 'price',
      key: 'price',
      width: 80,
      render: (text, record) => {
        const editing = isEditing(record)
        return editing ? (
          <InputNumber
            min={0}
            precision={2}
            defaultValue={text}
            size="small"
            style={{ width: '100%' }}
          />
        ) : (
          <span className="text-green-600">
            {text ? `¥${text.toFixed(2)}` : '-'}
          </span>
        )
      }
    },
    {
      title: t('table_subtotal'),
      key: 'subtotal',
      width: 80,
      render: (_, record) => {
        const subtotal = (record.price || 0) * record.quantity
        return (
          <span className="text-green-600 font-semibold">
            {subtotal > 0 ? `¥${subtotal.toFixed(2)}` : '-'}
          </span>
        )
      }
    }
  ]

  if (editable) {
    columns.push({
      title: t('actions'),
      key: 'action',
      width: 120,
      render: (_, record) => {
        const editing = isEditing(record)
        return editing ? (
          <Space>
            <Button
              icon={<SaveOutlined />}
              onClick={() => save()}
              size="small"
              type="primary"
            />
            <Button onClick={cancel} size="small">{t('cancel_text')}</Button>
          </Space>
        ) : (
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => edit(record)}
              size="small"
            />
            <Button
              icon={<ShoppingCartOutlined />}
              onClick={() => openPurchaseLink(record)}
              size="small"
              type="text"
            />
          </Space>
        )
      }
    })
  }

  const totalCost = calculateTotal()

  return (
    <div className="h-full">
      <Card 
        title={t('bom_title')}
        className="h-full"
        extra={
          <Space>
            <Button
              onClick={() => setShowSummary(!showSummary)}
              size="small"
              type={showSummary ? 'primary' : 'default'}
            >
              {t('stats')}
            </Button>
            <Button
              onClick={() => setGroupByType(!groupByType)}
              size="small"
              type={groupByType ? 'primary' : 'default'}
            >
              {t('group')}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportToCsv}
              size="small"
            >
              {t('export_csv')}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportToPdf}
              size="small"
              type="primary"
            >
              {t('export_pdf')}
            </Button>
          </Space>
        }
      styles={{ body: { padding: 0 } }}
    >
      <div className="p-4">
        {renderSummaryCard()}
        {data.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <ShoppingCartOutlined className="text-4xl mb-4" />
            <p>暂无BOM数据</p>
            <p className="text-sm">AI将根据电路设计自动生成物料清单</p>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1200, y: 400 }}
              size="small"
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
              }}
            />
            
            {totalCost > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg flex justify-between items-center">
                <span className="text-green-700">总成本估算</span>
                <span className="text-2xl font-bold text-green-600">
                  ¥{totalCost.toFixed(2)}
                </span>
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-500">
              * 价格仅供参考，实际采购价格可能有所不同
            </div>
          </>
        )}
      </div>
      </Card>
    </div>
  )
}

export default BOMTable