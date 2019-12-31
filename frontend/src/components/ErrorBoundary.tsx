import React from 'react'
import { view } from 'react-easy-state'
import Error from '/components/Error'

class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: any) {
    return { error, hasError: true }
  }

  public state = { hasError: false, error: undefined }

  render() {
    return this.state.hasError ? (
      <Error errors={this.state.error} />
    ) : (
      this.props.children
    )
  }
}

export default view(ErrorBoundary)
