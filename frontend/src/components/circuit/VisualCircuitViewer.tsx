import { useState, useRef, useEffect } from 'react'
import { Card, Button, Space, Switch, Slider, Select, Tooltip, message } from 'antd'
import { useI18n } from '../../i18n/I18nProvider'
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  DownloadOutlined, 
  FullscreenOutlined,
  BgColorsOutlined,
  BorderOutlined,
  AppstoreOutlined,
  TagOutlined,
  EditOutlined
} from '@ant-design/icons'
import { circuitRenderer, CircuitLayout, RenderOptions } from '../../services/circuitRenderer'

const { Option } = Select

interface VisualCircuitViewerProps {
  circuitData?: {
    ascii?: string
    components?: Array<{
      name?: string
      type?: string
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
  }
  loading?: boolean
  editable?: boolean
}

const VisualCircuitViewer = ({ 
  circuitData, 
  loading = false, 
  editable = false
}: VisualCircuitViewerProps) => {
  const { t } = useI18n()
  const svgRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [layout, setLayout] = useState<CircuitLayout | null>(null)
  const [renderOptions, setRenderOptions] = useState<RenderOptions>({
    gridSize: 20,
    showGrid: true,
    theme: 'light',
    scale: 1,
    showLabels: true,
    showPinNumbers: false
  })
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (circuitData?.ascii) {
      // 将ASCII电路数据转换为可视化布局
      const parsedLayout = circuitRenderer.parseASCIICircuit(circuitData.ascii)
      setLayout(parsedLayout)
    } else if (circuitData?.components && circuitData.components.length > 0) {
      // 使用自动布局
      const components = circuitData.components.map((comp, index) => ({
        id: comp.reference || `COMP${index + 1}`,
        type: getComponentType(comp.type || comp.name || ''),
        position: { x: 100 + (index % 3) * 120, y: 100 + Math.floor(index / 3) * 80 },
        rotation: 0,
        properties: { 
          value: comp.value || '',
          reference: comp.reference || `COMP${index + 1}`
        },
        symbol: circuitRenderer.getSymbol(getComponentType(comp.type || comp.name || '')) || circuitRenderer.getSymbol('resistor')!
      }))
      
      const autoLayout = circuitRenderer.autoLayout(components)
      setLayout(autoLayout)
    } else {
      // 显示示例电路
      const exampleLayout = circuitRenderer.parseASCIICircuit()
      setLayout(exampleLayout)
    }
  }, [circuitData])

  const getComponentType = (compName: string): string => {
    const name = compName.toLowerCase()
    
    // 电阻类
    if (name.includes('电阻') || name.includes('resistor') || name.match(/^r\d+$/)) return 'resistor'
    
    // 电容类  
    if (name.includes('电容') || name.includes('capacitor') || name.match(/^c\d+$/)) return 'capacitor'
    
    // 电感类
    if (name.includes('电感') || name.includes('inductor') || name.match(/^l\d+$/)) return 'inductor'
    
    // 二极管类
    if (name.includes('二极管') || name.includes('diode') || name.match(/^d\d+$/)) return 'diode'
    
    // LED类
    if (name.includes('led') || name.includes('发光二极管')) return 'led'
    
    // 晶体管类
    if (name.includes('晶体管') || name.includes('transistor') || name.match(/^q\d+$/)) return 'npn_transistor'
    
    // MOSFET类
    if (name.includes('mosfet') || name.includes('场效应管') || name.includes('mos')) return 'mosfet_n'
    
    // 运放类
    if (name.includes('运放') || name.includes('opamp') || name.includes('op-amp') || name.includes('lm358') || name.includes('lm741')) return 'opamp'
    
    // 开关类
    if (name.includes('开关') || name.includes('switch') || name.includes('按键')) return 'switch'
    
    // 保险丝类
    if (name.includes('保险丝') || name.includes('fuse') || name.includes('熔断器')) return 'fuse'
    
    // 晶振类
    if (name.includes('晶振') || name.includes('crystal') || name.includes('振荡器')) return 'crystal'
    
    // 电源类
    if (name.includes('电压源') || name.includes('voltage_source') || name.includes('电池')) return 'voltage_source'
    if (name.includes('电源') || name.includes('vcc') || name.includes('power') || name.includes('+5v') || name.includes('+3.3v')) return 'vcc'
    
    // 地线类
    if (name.includes('地') || name.includes('gnd') || name.includes('ground')) return 'ground'
    
    // 集成电路类
    if (name.includes('ic') || name.includes('芯片') || name.match(/^u\d+$/)) return 'opamp' // 暂时用运放符号代替
    
    return 'resistor' // 默认
  }

  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.2, 3)
    setScale(newScale)
    setRenderOptions(prev => ({ ...prev, scale: newScale }))
  }

  const handleZoomOut = () => {
    const newScale = Math.max(scale / 1.2, 0.3)
    setScale(newScale)
    setRenderOptions(prev => ({ ...prev, scale: newScale }))
  }

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setRenderOptions(prev => ({ ...prev, theme }))
  }

  const handleGridToggle = (showGrid: boolean) => {
    setRenderOptions(prev => ({ ...prev, showGrid }))
  }

  const handleGridSizeChange = (gridSize: number) => {
    setRenderOptions(prev => ({ ...prev, gridSize }))
  }

  const handleLabelsToggle = (showLabels: boolean) => {
    setRenderOptions(prev => ({ ...prev, showLabels }))
  }

  const handlePinNumbersToggle = (showPinNumbers: boolean) => {
    setRenderOptions(prev => ({ ...prev, showPinNumbers }))
  }

  const handleExportSVG = () => {
    if (!layout) {
      message.warning('No schematic to export')
      return
    }

    const svgString = circuitRenderer.renderToSVG(layout, renderOptions)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `circuit_${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    message.success('SVG exported')
  }

  const handleExportPNG = async () => {
    if (!layout) {
      message.warning('No schematic to export')
      return
    }

    try {
      const svgString = circuitRenderer.renderToSVG(layout, renderOptions)
      const blob = await circuitRenderer.exportToPNG(
        svgString, 
        layout.bounds.width * renderOptions.scale, 
        layout.bounds.height * renderOptions.scale
      )
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `circuit_${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      message.success('PNG exported')
    } catch (error) {
      message.error('PNG export failed: ' + (error as Error).message)
    }
  }

  const handleFullscreen = () => {
    if (!isFullscreen && svgRef.current) {
      svgRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const renderSVGContent = () => {
    if (!layout) return null
    
    const svgString = circuitRenderer.renderToSVG(layout, renderOptions)
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: svgString }}
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          transition: 'transform 0.3s ease'
        }}
      />
    )
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <BgColorsOutlined className="text-purple-600" />
          <span>{t('tab_visual')}</span>
          {layout && (
            <span className="text-sm text-gray-500">
              ({layout.components.length} {t('components')})
            </span>
          )}
        </div>
      }
      className="h-full"
      extra={
        <Space>
          {/* 主题切换 */}
          <Select
            value={renderOptions.theme}
            onChange={handleThemeChange}
            size="small"
            style={{ width: 80 }}
          >
            <Option value="light">{t('theme_light')}</Option>
            <Option value="dark">{t('theme_dark')}</Option>
          </Select>

          {/* 网格控制 */}
          <Tooltip title={t('toggle_grid')}>
            <Button
              icon={renderOptions.showGrid ? <AppstoreOutlined /> : <BorderOutlined />}
              onClick={() => handleGridToggle(!renderOptions.showGrid)}
              size="small"
              type={renderOptions.showGrid ? 'primary' : 'default'}
            />
          </Tooltip>

          {/* 标签控制 */}
          <Tooltip title={t('toggle_labels')}>
            <Button
              icon={<TagOutlined />}
              onClick={() => handleLabelsToggle(!renderOptions.showLabels)}
              size="small"
              type={renderOptions.showLabels ? 'primary' : 'default'}
            />
          </Tooltip>

          {/* 缩放控制 */}
          <Space.Compact>
            <Button
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
              size="small"
              disabled={scale <= 0.3}
            />
            <span className="px-2 text-xs leading-6 bg-gray-100 border-y">
              {Math.round(scale * 100)}%
            </span>
            <Button
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              size="small"
              disabled={scale >= 3}
            />
          </Space.Compact>

          {/* 全屏 */}
          <Tooltip title={t('fullscreen')}>
            <Button
              icon={<FullscreenOutlined />}
              onClick={handleFullscreen}
              size="small"
            />
          </Tooltip>

          {/* 导出功能 */}
          <Button.Group size="small">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportSVG}
              disabled={!layout}
            >
              {t('export_svg')}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportPNG}
              disabled={!layout}
            >
              {t('export_png')}
            </Button>
          </Button.Group>
        </Space>
      }
      styles={{ body: { padding: 0, height: 'calc(100% - 60px)' } }}
    >
      <div className="p-4">
        {/* 设置面板 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">{t('grid_size')}</label>
              <Slider
                min={10}
                max={50}
                value={renderOptions.gridSize}
                onChange={handleGridSizeChange}
              />
            </div>
            <div className="flex items-center">
              <Switch
                checked={renderOptions.showLabels}
                onChange={handleLabelsToggle}
                size="small"
              />
              <span className="ml-2">{t('show_labels')}</span>
            </div>
            <div className="flex items-center">
              <Switch
                checked={renderOptions.showPinNumbers}
                onChange={handlePinNumbersToggle}
                size="small"
              />
              <span className="ml-2">{t('show_pin_numbers')}</span>
            </div>
            <div className="flex items-center">
              <Switch
                checked={editable}
                size="small"
                disabled
              />
              <span className="ml-2 text-gray-400">{t('edit_mode')}</span>
            </div>
          </div>
        </div>

        {/* 主要显示区域 */}
        <div 
          ref={svgRef}
          className={`border rounded-lg overflow-auto ${
            renderOptions.theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
          }`}
          style={{ 
            height: '500px',
            backgroundColor: renderOptions.theme === 'dark' ? '#1a1a1a' : '#ffffff'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">{t('generating_schematic')}</p>
              </div>
            </div>
          ) : layout && layout.components.length > 0 ? (
            <div className="p-4">
              {renderSVGContent()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <BgColorsOutlined className="text-4xl mb-4 text-gray-300" />
                <p>{t('no_schematic')}</p>
                <p className="text-sm">{t('visual_schematic_hint')}</p>
              </div>
            </div>
          )}
        </div>

        {/* 组件库面板 - 如果是编辑模式 */}
        {editable && (
          <div className="mt-4 p-3 border rounded-lg">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <EditOutlined />
              {t('component_library')}
            </h4>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {circuitRenderer.getAllSymbols().map((symbol) => (
                <Tooltip key={symbol.id} title={symbol.name}>
                  <div 
                    className="p-2 border rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 text-center"
                    onClick={() => {
                      // TODO: 添加组件到电路
                      message.info(t('selected_symbol', { name: symbol.name }))
                    }}
                  >
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: `<svg width="30" height="20" viewBox="0 0 ${symbol.width} ${symbol.height}">${symbol.svgPath}</svg>` 
                      }}
                    />
                    <div className="text-xs mt-1 text-gray-600">{symbol.name}</div>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* 状态栏 */}
        {layout && (
          <div className="mt-4 flex justify-between items-center text-xs text-gray-500 border-t pt-2">
            <div>
              {t('canvas_size')}: {layout.bounds.width} × {layout.bounds.height} px
            </div>
            <div>
              {t('scale_label')}: {Math.round(scale * 100)}% | 
              {t('grid_label')}: {renderOptions.showGrid ? t('status_on') : t('status_off')} | 
              {t('theme_label')}: {renderOptions.theme === 'dark' ? t('theme_dark') : t('theme_light')}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default VisualCircuitViewer