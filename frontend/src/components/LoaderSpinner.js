import React from 'react'
import FontAwesome from 'react-fontawesome'
import { Col } from 'reactstrap'

class LoaderSpinner extends React.Component {
  render() {
    return (
      <Col sm="12" className="my-auto text-center fa-3x">
        <FontAwesome name="spinner" spin size="3x" />
      </Col>
    )
  }
}

export default LoaderSpinner
