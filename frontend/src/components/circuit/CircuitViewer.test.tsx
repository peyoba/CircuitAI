import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CircuitViewer from './CircuitViewer'
import { I18nProvider } from '../../i18n/I18nProvider'

// 测试工具函数：用 I18nProvider 包装组件
const renderWithI18n = (ui: React.ReactElement) => {
  return render(
    <I18nProvider>
      {ui}
    </I18nProvider>
  )
}

describe('CircuitViewer', () => {
  it('shows empty state when no circuit data', () => {
    renderWithI18n(<CircuitViewer />)
    expect(screen.getByText('No schematic yet')).toBeInTheDocument()
    expect(screen.getByText('Please describe your circuit design needs in the chat on the left')).toBeInTheDocument()
  })

  it('shows loading state when loading is true', () => {
    renderWithI18n(<CircuitViewer loading={true} />)
    expect(screen.getByText('Generating circuit...')).toBeInTheDocument()
  })

  it('renders ASCII circuit when data is provided', () => {
    const circuitData = {
      ascii: 'LED --- R1 --- VCC',
      description: '简单LED电路'
    }
    renderWithI18n(<CircuitViewer circuitData={circuitData} />)
    expect(screen.getByText('LED --- R1 --- VCC')).toBeInTheDocument()
  })

  it('shows circuit description when provided', () => {
    const circuitData = {
      ascii: 'LED --- R1 --- VCC',
      description: '这是一个简单的LED指示灯电路'
    }
    renderWithI18n(<CircuitViewer circuitData={circuitData} />)
    expect(screen.getByText('这是一个简单的LED指示灯电路')).toBeInTheDocument()
  })

  it('renders tabs for different views', () => {
    renderWithI18n(<CircuitViewer />)
    expect(screen.getByText('Schematic')).toBeInTheDocument()
    expect(screen.getByText('Components')).toBeInTheDocument()
    expect(screen.getByText('Connections')).toBeInTheDocument()
    // 电路参数已整合到元件列表中，不再有独立的标签页
  })
})