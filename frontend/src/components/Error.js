import React from 'react'
import { withRouter } from 'react-router-dom'
import {
  Button,
  Col,
  Container,
  ListGroup,
  ListGroupItem,
  Row,
} from 'reactstrap'

class Error extends React.PureComponent {
  handleBack() {
    this.props.history.goBack()
  }

  render() {
    return (
      <Container className="h-100 fixed-top loader error">
        <Row className="h-100">
          <Col sm="6" className="my-auto text-center mx-auto">
            <h3>
              In the process of loading this page, the following error(s)
              occured:
            </h3>
            <br />
            <ListGroup>
              {Object.entries(this.props.children).map((entry, idx) => {
                return (
                  <ListGroupItem key={idx}>
                    {entry[1]} ({entry[0]})
                  </ListGroupItem>
                )
              })}
            </ListGroup>
            <br />
            <Button onClick={this.handleBack.bind(this)}>Go back</Button>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default withRouter(Error)
