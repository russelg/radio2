import React, { FunctionComponent } from 'react'
import { animated, useSpring } from 'react-spring'
import { Col, Spinner } from 'reactstrap'

export interface Props {
  style?: object
  size?: string | object
}

const LoaderSpinner: FunctionComponent<Props> = ({
  style = {},
  size = 'lg'
}) => {
  const props = useSpring({
    opacity: 1,
    from: { opacity: 0 }
  })
  const isStr = Object.prototype.toString.call(size) === '[object String]'
  return (
    <animated.div style={props}>
      <Col
        sm="12"
        className="d-flex justify-content-center fa-3x"
        style={style}>
        <Spinner
          className=""
          size={isStr ? size : undefined}
          color="info"
          style={
            size === undefined
              ? {
                  width: '8rem',
                  height: '8rem'
                }
              : isStr
              ? undefined
              : (size as object)
          }
        />
      </Col>
    </animated.div>
  )
}

export default LoaderSpinner
