import React from 'react'
import { view } from 'react-easy-state'
import { Container, Row } from 'reactstrap'
import LoaderSpinner from '/components/LoaderSpinner'
import { css, cx } from 'emotion'

const topmost = css`
  z-index: 10;
`

export interface Props {
  pastDelay?: boolean
  error?: boolean
  retry?: () => void
}

const Loader: React.FunctionComponent<Props> = ({
  pastDelay = false,
  error = false,
  retry = () => null
}) => {
  if (error) {
    return (
      <div>
        Sorry, there was a problem loading the page.
        <button onClick={retry}>Retry</button>
      </div>
    )
  }

  if (pastDelay) {
    return (
      <Container className={cx(topmost, 'h-100 fixed-top')}>
        <Row className="h-100">
          <LoaderSpinner />
        </Row>
      </Container>
    )
  }

  return null
}

export default view(Loader)
