import React from 'react'
import ReactDOM from 'react-dom'
import { Col, Container, Row } from 'reactstrap'

import FontAwesome from 'react-fontawesome'

import './Loader.css'

class Loader extends React.Component {
  componentDidMount() {
    let elem = ReactDOM.findDOMNode(this)

    // fade loader in
    elem.style.opacity = 0
    window.requestAnimationFrame(() => {
      elem.style.transition = 'opacity 250ms'
      elem.style.opacity = 1
    })
  }

  render() {
    const { postDelay = true, error = false, retry } = this.props
    if (postDelay) {
      return (
        <Container className="h-100 fixed-top loader">
          <Row className="h-100">
            <Col sm="12" className="my-auto text-center fa-3x">
              <FontAwesome name="spinner" spin size="3x" />
            </Col>
          </Row>
        </Container>
      )
    } else if (error) {
      return (
        <div>
          Sorry, there was a problem loading the page.
          <button onClick={retry}>Retry</button>
        </div>
      )
    } else {
      return <span />
    }
  }
}

export default Loader
