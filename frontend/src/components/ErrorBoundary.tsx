import Error from '/components/Error'
import React from 'react'

interface ErrorBoundaryProps {
}

interface ErrorBoundaryState {
  error: any
  errorInfo: any
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps,
  ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Catch errors in any components below and re-render with error message
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.errorInfo) {
      // Error path
      return <Error {...this.state} />
    }
    // Normally, just render children
    return this.props.children
  }
}

export default ErrorBoundary
