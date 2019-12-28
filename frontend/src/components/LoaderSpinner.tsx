import React from 'react'
import { findDOMNode } from 'react-dom'
import { Col, Spinner } from 'reactstrap'

export interface Props {
  style?: object
  size?: any
}

class LoaderSpinner extends React.PureComponent<Props> {
  static defaultProps = {
    size: 'sm',
    style: {}
  }

  componentDidMount() {
    const elem = findDOMNode(this) as HTMLElement

    // fade loader in
    if (elem instanceof HTMLElement) {
      window.requestAnimationFrame(() => {
        elem.style.opacity = '1'
      })
    }
  }

  render() {
    return (
      <Col
        sm="12"
        className="d-flex justify-content-center fa-3x"
        style={{
          transition: 'opacity 300ms',
          opacity: 0,
          ...this.props.style
        }}>
        <Spinner
          className=""
          size={this.props.size || undefined}
          color="info"
          style={
            this.props.size === undefined
              ? {
                  width: '8rem',
                  height: '8rem'
                }
              : undefined
          }
        />
      </Col>
    )
  }
}

export default LoaderSpinner
