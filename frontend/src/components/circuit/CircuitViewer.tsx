import { useState } from 'react'
import { Card, Tabs, Button, message, Spin, Empty } from 'antd'
import { useI18n } from '../../i18n/I18nProvider'
import { CopyOutlined, DownloadOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons'

interface Component {
  name: string
  type: string
  value?: string
  reference?: string
  package?: string
  description?: string
}

interface Connection {
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
}

interface Property {
  name: string
  value: string
  unit?: string
  description?: string
}

interface CircuitData {
  ascii?: string
  description?: string
  components?: Component[]
  connections?: Connection[]
  properties?: Property[]
}

interface CircuitViewerProps {
  circuitData?: CircuitData
  loading?: boolean
}

const CircuitViewer = ({ circuitData, loading = false }: CircuitViewerProps) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('ascii')
  const [fontSize, setFontSize] = useState(12)
  const [darkMode, setDarkMode] = useState(true)
  const [showLineNumbers, setShowLineNumbers] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('Copied to clipboard')
    } catch (error) {
      message.error('Copy failed')
    }
  }

  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderASCIICircuit = () => {
    if (!circuitData?.ascii) {
      return (
        <Empty 
          description={t('no_schematic')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <p className="text-gray-500">{t('schematic_hint')}</p>
        </Empty>
      )
    }

    return (
      <div className="relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 items-center">
            <Button
              icon={<ZoomOutOutlined />}
              onClick={() => setFontSize(Math.max(8, fontSize - 1))}
              size="small"
            />
            <span className="text-sm text-gray-600 min-w-[40px] text-center">{fontSize}px</span>
            <Button
              icon={<ZoomInOutlined />}
              onClick={() => setFontSize(Math.min(20, fontSize + 1))}
              size="small"
            />
            <div className="h-4 w-px bg-gray-300 mx-2" />
            <Button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              size="small"
              type={showLineNumbers ? 'primary' : 'default'}
            >Line #</Button>
            <Button
              onClick={() => setDarkMode(!darkMode)}
              size="small"
              type={darkMode ? 'primary' : 'default'}
            >
              {darkMode ? '🌙' : '☀️'}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(circuitData.ascii || '')}
              size="small"
            >Copy</Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadAsText(circuitData.ascii || '', 'circuit.txt')}
              size="small"
            >Download</Button>
          </div>
        </div>
        
        <div 
          className={`p-4 rounded-lg overflow-auto font-mono relative ${
            darkMode 
              ? 'bg-gray-900 text-green-400 border border-gray-700' 
              : 'bg-white text-gray-800 border border-gray-300'
          }`}
          style={{ 
            maxHeight: '400px',
          }}
        >
          {showLineNumbers ? (
            <div className="flex">
              <div className={`pr-4 text-right select-none ${darkMode ? 'text-gray-500' : 'text-gray-400'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-300'} mr-4`}>
                {circuitData.ascii?.split('\n').map((_, index) => (
                  <div key={index} style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}>
                    {index + 1}
                  </div>
                ))}
              </div>
              <div className="flex-1">
                <pre 
                  className="whitespace-pre"
                  style={{ 
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.2,
                    margin: 0
                  }}
                >
                  {circuitData.ascii}
                </pre>
              </div>
            </div>
          ) : (
            <pre 
              className="whitespace-pre"
              style={{ 
                fontSize: `${fontSize}px`,
                lineHeight: 1.2,
                margin: 0
              }}
            >
              {circuitData.ascii}
            </pre>
          )}
        </div>
        
        {circuitData.description && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Description</h4>
            <p className="text-sm text-blue-700">{circuitData.description}</p>
          </div>
        )}
      </div>
    )
  }

  const renderComponentsList = () => {
    if (!circuitData?.components || circuitData.components.length === 0) {
      return (
        <Empty 
          description="No component info"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )
    }

    // 从电路参数中提取与组件相关的参数信息
    const getComponentParameters = (componentType: string) => {
      if (!circuitData?.properties) return []
      
      return circuitData.properties.filter(prop => {
        // 匹配组件相关的参数
        const propName = prop.name.toLowerCase()
        const compType = componentType.toLowerCase()
        
        return propName.includes(compType) || 
               propName.includes('电阻') && compType.includes('resistor') ||
               propName.includes('电容') && compType.includes('capacitor') ||
               propName.includes('电压') || propName.includes('电流') || propName.includes('功率')
      })
    }

    return (
      <div className="space-y-4">
        {circuitData.components.map((component, index) => {
          const parameters = getComponentParameters(component.type)
          
          return (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              {/* 元件基本信息 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-800">{component.name}</h4>
                    {component.reference && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-mono rounded">
                        {component.reference}
                      </span>
                    )}
                  </div>
                  
                  {/* 详细参数表格 */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-mono text-gray-800">{component.type}</span>
                    </div>
                    
                    {component.value && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Value:</span>
                        <span className="font-mono text-blue-600 font-semibold">{component.value}</span>
                      </div>
                    )}
                    
                    {component.reference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ref:</span>
                        <span className="font-mono text-gray-800">{component.reference}</span>
                      </div>
                    )}
                    
                    {component.package && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Package:</span>
                        <span className="font-mono text-gray-800">{component.package}</span>
                      </div>
                    )}
                    
                    {/* 显示相关的电路参数 */}
                    {parameters.slice(0, 4).map((param, paramIndex) => (
                      <div key={paramIndex} className="flex justify-between">
                        <span className="text-gray-600">{param.name}:</span>
                        <span className="font-mono text-green-600">
                          {param.value}{param.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* 描述信息 */}
              {component.description && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{component.description}</p>
                </div>
              )}
            </div>
          )
        })}
        
        {/* 显示通用电路参数 */}
        {circuitData?.properties && circuitData.properties.length > 0 && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">Circuit Properties</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {circuitData.properties.map((prop, index) => (
                <div key={index} className="flex flex-col">
                  <span className="text-sm text-blue-600 font-medium">{prop.name}</span>
                  <span className="text-lg font-mono text-blue-800">
                    {prop.value}{prop.unit}
                  </span>
                  {prop.description && (
                    <span className="text-xs text-blue-500">{prop.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderConnectionsList = () => {
    if (!circuitData?.connections || circuitData.connections.length === 0) {
      return (
        <Empty 
          description="No connection info"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )
    }

    return (
      <div className="space-y-2">
        {circuitData.connections.map((connection, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                {connection.from.component}
              </span>
              {connection.from.pin && (
                <span className="text-xs text-blue-600">({connection.from.pin})</span>
              )}
              <span className="text-gray-400 font-bold">→</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                {connection.to.component}
              </span>
              {connection.to.pin && (
                <span className="text-xs text-green-600">({connection.to.pin})</span>
              )}
            </div>
            {connection.label && (
              <div className="text-xs text-gray-600">{connection.label}</div>
            )}
            {connection.description && (
              <div className="text-xs text-gray-500 mt-1">{connection.description}</div>
            )}
          </div>
        ))}
      </div>
    )
  }


  if (loading) {
    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-96">
          <Spin size="large" />
          <span className="ml-3">Generating circuit...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      title="Circuit Design" 
      className="h-full"
      styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="h-full"
        tabBarStyle={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
        items={[
          {
            key: 'ascii',
            label: 'Schematic',
            children: (
              <div className="h-full overflow-auto p-4">
                {renderASCIICircuit()}
              </div>
            )
          },
          {
            key: 'components',
            label: 'Components',
            children: (
              <div className="h-full overflow-auto p-4">
                {renderComponentsList()}
              </div>
            )
          },
          {
            key: 'connections',
            label: 'Connections',
            children: (
              <div className="h-full overflow-auto p-4">
                {renderConnectionsList()}
              </div>
            )
          }
        ]}
      />
    </Card>
  )
}

export default CircuitViewer