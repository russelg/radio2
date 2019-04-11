import React from 'react'
import ReactDOM from 'react-dom'
import { Col, Spinner } from 'reactstrap'

class LoaderSpinner extends React.Component {
  componentDidMount() {
    let elem = ReactDOM.findDOMNode(this)

    // fade loader in
    window.requestAnimationFrame(() => {
      elem.style.opacity = 1
    })
  }

  render() {
    return (
      <Col
        sm="12"
        className="d-flex justify-content-center fa-3x"
        style={{
          transition: 'opacity 300ms',
          opacity: '0',
          ...this.props.style,
        }}>
        <Spinner
          className="align-self-center"
          style={{ width: '8rem', height: '8rem' }}
        />
      </Col>
    )
  }
}

export default LoaderSpinner
