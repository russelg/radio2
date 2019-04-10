import React from 'react'
import { Col, Spinner } from 'reactstrap'

class LoaderSpinner extends React.PureComponent {
  render() {
    return (
      <Col sm="12" className="my-auto text-center fa-3x">
        <Spinner style={{ width: '8rem', height: '8rem' }} />
      </Col>
    )
  }
}

export default LoaderSpinner
