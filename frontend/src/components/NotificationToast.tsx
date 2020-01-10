import React, { FunctionComponent } from 'react'
import { Toast, ToastHeader, ToastBody, Alert } from 'reactstrap'

interface NotificationToastProps {
  error?: boolean
  closeToast?: () => void
}

const NotificationToast: FunctionComponent<NotificationToastProps> = ({
  closeToast,
  children,
  error = false
}) => {
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
