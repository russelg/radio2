import React from 'react'
import {Col, Container, Row} from 'reactstrap'
import {withRouter} from 'react-router-dom'

class Error extends React.Component {
  handleBack() {
    this.props.history.goBack()
  }

  render() {
    return (
      <Container className='h-100 fixed-top loader'>
        <Row className='h-100'>
          <Col sm='12' className='my-auto text-center'>
            In the process of loading this page, the following error occured:
            <h3>{this.props.children}</h3>
            <a onClick={this.handleBack.bind(this)} href="#">Go back</a>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default withRouter(Error)
