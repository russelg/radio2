import React, { FunctionComponent } from 'react'
import { view } from 'react-easy-state'
import { RouteComponentProps, withRouter } from 'react-router-dom'
import {
  Button,
  Col,
  Container,
  ListGroup,
  ListGroupItem,
  Row
} from 'reactstrap'
import { css } from 'emotion'

interface ErrorProps extends RouteComponentProps<any> {
  errors?: string | any[] | { message: string; stack: string } | null
}

const preStyle = css`
  color: #fff;
  text-align: left;
`

const Error: FunctionComponent<ErrorProps> = ({ errors, history }) =>
  errors ? (
    <Container className="h-100 loader error">
      <Row className="h-100">
        <Col sm="6" className="my-auto text-center mx-auto">
          <h3>
            In the process of loading this page, the following error(s)
            occurred:
          </h3>
          <br />
          <ListGroup>
            {typeof errors !== 'string' ? (
              Array.isArray(errors) ? (
                Object.entries(errors).map((entry, idx) => {
                  return (
                    <ListGroupItem key={idx}>
                      <pre className={preStyle}>
                        {entry[1]} ({entry[0]})
                      </pre>
                    </ListGroupItem>
                  )
                })
              ) : (
                <ListGroupItem>
                  <pre className={preStyle}>{errors.message}</pre>
                </ListGroupItem>
              )
            ) : (
              <ListGroupItem>
                <pre className={preStyle}>{errors}</pre>
              </ListGroupItem>
            )}
          </ListGroup>
          <br />
          <Button onClick={() => history.goBack()}>Go back</Button>
        </Col>
      </Row>
    </Container>
  ) : null

export default withRouter(view(Error))
