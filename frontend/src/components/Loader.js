import React from 'react'
import { Container, Row } from 'reactstrap'
import './Loader.css'
import LoaderSpinner from './LoaderSpinner'

class Loader extends React.Component {
  render() {
    const { pastDelay, error, retry } = this.props
    if (error) {
      return (
        <div>
          Sorry, there was a problem loading the page.
          <button onClick={retry}>Retry</button>
        </div>
      )
    } else if (pastDelay) {
      return (
        <Container className="h-100 fixed-top loader">
          <Row className="h-100">
            <LoaderSpinner />
          </Row>
        </Container>
      )
    } else {
      return <span />
    }
  }
}

export default Loader
