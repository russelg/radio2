import React, { FunctionComponent } from 'react'
import { Container, Row } from 'reactstrap'
import './Loader.css'
import LoaderSpinner from './LoaderSpinner'

export interface Props {
  pastDelay?: boolean
  error?: boolean
  retry?: () => void
}

const Loader: FunctionComponent<Props> = ({
  pastDelay = false,
  error = false,
  retry = () => null,
}) => {
  if (error) {
    return (
      <div>
        Sorry, there was a problem loading the page.
        <button onClick={retry}>Retry</button>
      </div>
    )
  } else if (pastDelay) {
    return (
      <Container className="h-100 fixed-top loader">
        <Row className="h-100">
          <LoaderSpinner />
        </Row>
      </Container>
    )
  } else {
    return <span />
  }
}

export default Loader
