import React from 'react'
import Error from '/components/Error'

export default class extends React.Component {
  static getDerivedStateFromError(error: any) {
    return { error, hasError: true }
  }

  public state = { hasError: false, error: null }

  render() {
    return this.state.hasError ? (
      <Error errors={this.state.error} />
    ) : (
      this.props.children
    )
  }
}
