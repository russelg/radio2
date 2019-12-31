import React, { FunctionComponent } from 'react'
import { view } from 'react-easy-state'
import { Card, CardBody, CardTitle, Col, Container, Row } from 'reactstrap'

export interface DialogProps {
  title: string
}

const Dialog: FunctionComponent<DialogProps> = ({ title, children }) => (
  <Container className="content-panel">
    <Row className="align-items-center">
      <Col lg={{ size: 8, offset: 2 }}>
        <Card>
          <CardBody className="mx-auto col-md-8">
            <CardTitle className="text-center" tag="h2">
              {title}
            </CardTitle>
            {children}
          </CardBody>
        </Card>
      </Col>
    </Row>
  </Container>
)

export default view(Dialog)
