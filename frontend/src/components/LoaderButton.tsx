import { css, cx } from 'emotion'
import React, { FunctionComponent, useEffect, useState } from 'react'
import { view } from 'react-easy-state'
import { animated, useSpring } from 'react-spring'
import { Button, ButtonProps, Spinner } from 'reactstrap'

interface LoaderButtonProps extends ButtonProps {
  loading: boolean
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
  ...rest
}) => {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    if (loading) {
      setShowLoader(true)
    }

    // Show loader a bits longer to avoid loading flash
    if (!loading && showLoader) {
      const timeout = setTimeout(() => {
        setShowLoader(false)
      }, 400)

      return () => {
        clearTimeout(timeout)
      }
    }

    return () => {}
  }, [loading, showLoader])

  const fadeOutProps = useSpring({ opacity: showLoader ? 1 : 0 })
  const fadeInProps = useSpring({ opacity: showLoader ? 0 : 1 })

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

export default view(LoaderButton)
