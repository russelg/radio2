import React, { FunctionComponent, ReactNode, useEffect, useState } from 'react'
import { view } from 'react-easy-state'
import Skeleton from 'react-loading-skeleton'
import { animated, useSpring } from 'react-spring'
import { useIsMounted } from '/utils'

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
  // children: () => ReactNode | any
}

const LoaderSkeleton: FunctionComponent<SkeletonProps &
  LoaderSkeletonProps> = ({ loading, children, ...rest }) => {
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    // make sure we're mounted before doing anything
    if (loading) {
      setShowSkeleton(true)
    }

    // Show loader a bits longer to avoid loading flash
    if (!loading && showSkeleton) {
      const timeout = setTimeout(() => {
        setShowSkeleton(false)
      }, 250)

      return () => {
        clearTimeout(timeout)
      }
    }
    return () => {}
  }, [loading, showSkeleton])

  const fadeOutProps = useSpring({ opacity: showSkeleton ? 1 : 0 })
  const fadeInProps = useSpring({ opacity: showSkeleton ? 0 : 1 })

  return (
    <>
      {showSkeleton && (
        <animated.span style={fadeOutProps}>
          <Skeleton {...rest} />
        </animated.span>
      )}
      {!showSkeleton && (
        <animated.span style={fadeInProps}>
          {children &&
            !loading &&
            (children instanceof Function ? children() : children)}
        </animated.span>
      )}
    </>
  )
}

export default view(LoaderSkeleton)
