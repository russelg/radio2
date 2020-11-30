import React, { FunctionComponent, ReactNode } from 'react'
import Skeleton from 'react-loading-skeleton'
import { animated, useSpring } from 'react-spring'

interface SkeletonProps {
  count?: number
  duration?: number
  width?: string | number
  wrapper?: ReactNode
  height?: string | number
  circle?: boolean
}

interface LoaderSkeletonProps {
  loading: boolean
}

const LoaderSkeleton: FunctionComponent<SkeletonProps &
  LoaderSkeletonProps> = ({ loading, children, ...rest }) => {
  const fadeOutProps = useSpring({ opacity: loading ? 1 : 0 })
  const fadeInProps = useSpring({ opacity: loading ? 0 : 1 })

  return (
    <>
      {loading && (
        <animated.span style={fadeOutProps}>
          <Skeleton {...rest} />
        </animated.span>
      )}
      {!loading && (
        <animated.span style={fadeInProps}>
          {children &&
          !loading &&
          (children instanceof Function ? children() : children)}
        </animated.span>
      )}
    </>
  )
}

export default LoaderSkeleton
