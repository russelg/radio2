import React from 'react'
import { view } from 'react-easy-state'
import { RouteComponentProps, withRouter } from 'react-router-dom'
import {
  Button,
  Col,
  Container,
  ListGroup,
  ListGroupItem,
  Row,
} from 'reactstrap'

interface Props extends RouteComponentProps<any> {
  errors?: any
}

class Error extends React.Component<Props> {
  render() {
    return (
      this.props.errors && (
        <Container className="h-100 loader error">
          <Row className="h-100">
            <Col sm="6" className="my-auto text-center mx-auto">
              <h3>
                In the process of loading this page, the following error(s)
                occurred:
              </h3>
              <br />
              <ListGroup>
                {typeof this.props.errors !== 'string' ? (
                  Object.entries(this.props.errors).map((entry, idx) => {
                    return (
                      <ListGroupItem key={idx}>
                        {entry[1]} ({entry[0]})
                      </ListGroupItem>
                    )
                  })
                ) : (
                  <ListGroupItem>{this.props.errors}</ListGroupItem>
                )}
              </ListGroup>
              <br />
              <Button onClick={() => this.props.history.goBack()}>
                Go back
              </Button>
            </Col>
          </Row>
        </Container>
      )
    )
  }
}

export default withRouter(view(Error))
