import { css, cx } from 'emotion'
import React, { FunctionComponent, useEffect } from 'react'
import { animated, useSpring } from 'react-spring'
import { Button, ButtonProps, Spinner } from 'reactstrap'
import { useDelayedLoader } from '/utils'

interface LoaderButtonProps extends ButtonProps {
  loading: boolean
  useDelay?: boolean
}

const buttonStyle = css`
  left: calc(50% - calc(1rem / 2));
`

const spanStyle = css`
  margin-left: -1rem;
`

const LoaderButton: FunctionComponent<LoaderButtonProps> = ({
  children,
  loading,
  block,
  useDelay = true,
  ...rest
}) => {
  const [showLoader, setShowLoader] = useDelayedLoader(loading)

  const fadeOutProps = useSpring({ opacity: showLoader ? 1 : 0 })
  const fadeInProps = useSpring({ opacity: showLoader ? 0 : 1 })

  useEffect(() => {
    setShowLoader(loading)
  }, [showLoader, loading])

  return (
    <Button {...rest} block={block}>
      {!(block && !showLoader) && (
        <animated.span style={fadeOutProps}>
          <Spinner
            className={cx('position-relative', {
              visible: showLoader,
              invisible: !showLoader,
              [buttonStyle]: !block
            })}
            size="sm"
            // type="grow"
          />
        </animated.span>
      )}
      {!(block && showLoader) && (
        <animated.span
          className={cx({
            invisible: showLoader,
            visible: !showLoader,
            [spanStyle]: !block
          })}
          style={fadeInProps}>
          {children}
        </animated.span>
      )}
    </Button>
  )
}

export default LoaderButton
