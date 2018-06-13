import React from 'react'
import { Col, Container, Row } from 'reactstrap'

class Error extends React.Component {
  render() {
    return (
      <Container className='h-100 fixed-top loader'>
        <Row className='h-100'>
          <Col sm='12' className='my-auto text-center fa-3x'>
            {this.props.children}
          </Col>
        </Row>
      </Container>
    )
  }
}

export default Error
