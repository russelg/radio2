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
  error: any
  errorInfo: any
  large?: boolean
}

const preStyle = css`
  color: #fff;
  text-align: left;
  white-space: pre-wrap;
`

const Error: FunctionComponent<ErrorProps> = ({
  error,
  errorInfo,
  large = false,
  history
}) => {
  const inside = (
    <pre className={preStyle}>
      {!large && error && error.toString()}
      <br />
      {errorInfo.componentStack}
    </pre>
  )

  return errorInfo ? (
    <Container className="h-100 loader error">
      <Row className="h-100">
        <Col sm="6" className="my-auto text-center mx-auto">
          <h3>Something went wrong while loading this page.</h3>
          <br />
          <ListGroup>
            <ListGroupItem>
              {large && (
                <>
                  <h4>{error && error.toString()}</h4>
                  {'componentStack' in errorInfo && inside}
                </>
              )}
              {!large && (
                <details className={preStyle}>
                  <hr />
                  {inside}
                </details>
              )}
            </ListGroupItem>
          </ListGroup>
          <br />
          <Button onClick={() => history.goBack()}>Go back</Button>
        </Col>
      </Row>
    </Container>
  ) : null
}

export default withRouter(view(Error))
