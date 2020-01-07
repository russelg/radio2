import React, { FunctionComponent } from 'react'
import { Toast, ToastHeader, ToastBody } from 'reactstrap'

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
    <Toast className="mb-3" isOpen={true}>
      <ToastHeader toggle={closeToast} icon={error ? 'danger' : 'success'}>
        {error ? 'Error' : 'Success!'}
      </ToastHeader>
      <ToastBody>{children}</ToastBody>
    </Toast>
  )
}

export default NotificationToast
