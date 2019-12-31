import React from 'react'
import { findDOMNode } from 'react-dom'
import { Col, Spinner } from 'reactstrap'
import { view } from 'react-easy-state'

export interface Props {
  style?: object
  size?: string | object
}

class LoaderSpinner extends React.Component<Props> {
  static defaultProps = {
    size: 'lg',
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
    const isStr =
      Object.prototype.toString.call(this.props.size) === '[object String]'
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
            this.props.size === undefined || isStr
              ? {
                  width: '8rem',
                  height: '8rem'
                }
              : (this.props.size as object)
          }
        />
      </Col>
    )
  }
}

export default view(LoaderSpinner)
