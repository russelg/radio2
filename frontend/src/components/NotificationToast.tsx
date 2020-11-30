import React, { FunctionComponent, useEffect } from 'react'
import { Alert } from 'reactstrap'

interface NotificationToastProps {
  error?: boolean
  closeToast?: () => void
}

const NotificationToast: FunctionComponent<NotificationToastProps> = ({
                                                                        closeToast,
                                                                        children,
                                                                        error = false,
                                                                      }) => {
  useEffect(() => {
    if (closeToast) {
      const id = setTimeout(closeToast, 3000)
      return () => clearTimeout(id)
    }
    return () => {
    }
  }, [closeToast])

  return (
    <Alert
      color={error ? 'danger' : 'success'}
      isOpen={true}
      toggle={closeToast}>
      <h5 className="alert-heading">{error ? 'Error' : 'Success!'}</h5>
      <p>{children}</p>
    </Alert>
  )
}

export default NotificationToast
