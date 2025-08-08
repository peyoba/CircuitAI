import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CircuitViewer from './CircuitViewer'

describe('CircuitViewer', () => {
  it('shows empty state when no circuit data', () => {
    render(<CircuitViewer />)
    expect(screen.getByText('暂无电路图')).toBeInTheDocument()
    expect(screen.getByText('请在左侧描述您的电路设计需求')).toBeInTheDocument()
  })

  it('shows loading state when loading is true', () => {
    render(<CircuitViewer loading={true} />)
    expect(screen.getByText('正在生成电路图...')).toBeInTheDocument()
  })

  it('renders ASCII circuit when data is provided', () => {
    const circuitData = {
      ascii: 'LED --- R1 --- VCC',
      description: '简单LED电路'
    }
    render(<CircuitViewer circuitData={circuitData} />)
    expect(screen.getByText('LED --- R1 --- VCC')).toBeInTheDocument()
  })

  it('shows circuit description when provided', () => {
    const circuitData = {
      ascii: 'LED --- R1 --- VCC',
      description: '这是一个简单的LED指示灯电路'
    }
    render(<CircuitViewer circuitData={circuitData} />)
    expect(screen.getByText('这是一个简单的LED指示灯电路')).toBeInTheDocument()
  })

  it('renders tabs for different views', () => {
    render(<CircuitViewer />)
    expect(screen.getByText('电路图')).toBeInTheDocument()
    expect(screen.getByText('元件列表')).toBeInTheDocument()
    expect(screen.getByText('连接关系')).toBeInTheDocument()
    // 电路参数已整合到元件列表中，不再有独立的标签页
  })
})