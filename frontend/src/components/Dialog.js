import React from 'react'
import { Card, CardBody, CardTitle, Col, Container, Row } from 'reactstrap'

class Dialog extends React.PureComponent {
  render() {
    return (
      <Container className="content-panel">
        <Row className="align-items-center">
          <Col lg={{ size: 8, offset: 2 }}>
            <Card>
              <CardBody className="mx-auto col-md-8">
                <CardTitle className="text-center" tag="h2">
                  {this.props.title}
                </CardTitle>
                <>{this.props.children}</>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default Dialog
