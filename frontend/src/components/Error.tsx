import { css } from 'emotion'
import React, { FunctionComponent } from 'react'
import { useHistory } from 'react-router-dom'
import {
  Button,
  Col,
  Container,
  ListGroup,
  ListGroupItem,
  Row
} from 'reactstrap'

interface ErrorProps {
  error: any
  errorInfo: any
  large?: boolean
}

const preStyle = css`
  text-align: left;
  white-space: pre-wrap;
`

const Error: FunctionComponent<ErrorProps> = ({
  error,
  errorInfo,
  large = false
}) => {
  const history = useHistory()

  const inside = (
    <pre className={preStyle}>
      {!large && error && error.toString()}
      <br />
      {errorInfo.componentStack}
    </pre>
  )

  return errorInfo ? (
    <Container className="mt-5 h-100 loader error">
      <Row className="h-100">
        <Col sm="6" className="my-auto text-center mx-auto">
          <h3>Something went wrong while loading this page.</h3>
          <br />
          <ListGroup>
            <ListGroupItem>
              {large && (
                <>
                  {error === Object(error) ? (
                    Object.values(error).map((err) => <h4 key={err}>{err}</h4>)
                  ) : (
                    <h4>{error && error.toString()}</h4>
                  )}
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

export default Error
