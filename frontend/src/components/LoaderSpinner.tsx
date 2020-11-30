import React, { FunctionComponent } from 'react'
import { animated, useSpring } from 'react-spring'
import { Col, Spinner } from 'reactstrap'

export interface LoaderSpinnerProps {
}

const LoaderSpinner: FunctionComponent<LoaderSpinnerProps> = () => {
  const props = useSpring({
    opacity: 1,
    from: { opacity: 0 },
  })
  return (
    <animated.div style={props}>
      <Col sm="12" className="d-flex justify-content-center fa-3x mt-5">
        <Spinner
          color="info"
          style={{
            width: '8rem',
            height: '8rem',
          }}
        />
      </Col>
    </animated.div>
  )
}

export default LoaderSpinner
