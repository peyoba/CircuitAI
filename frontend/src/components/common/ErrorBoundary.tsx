import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>页面出现错误</h2>
          <p>请刷新重试，或联系支持。</p>
          {this.state.error?.message && (
            <pre style={{ color: '#c00', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}


