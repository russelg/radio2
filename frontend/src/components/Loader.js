import React from 'react'
import ReactDOM from 'react-dom'
import { Container, Row } from 'reactstrap'
import './Loader.css'
import LoaderSpinner from './LoaderSpinner'

class Loader extends React.PureComponent {
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
            <LoaderSpinner />
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
