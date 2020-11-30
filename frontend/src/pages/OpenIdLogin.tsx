import Dialog from '/components/Dialog'
import LoginOpenId from '/components/LoginOpenId'
import { useAuthState } from '/contexts/auth'
import React, { FunctionComponent } from 'react'
import { Redirect } from 'react-router-dom'

const OpenIdLogin: FunctionComponent = () => {
  const { loggedIn } = useAuthState()
  if (loggedIn) return <Redirect to="/" />

  return (
    <Dialog title="OpenID Login">
      <LoginOpenId />
    </Dialog>
  )
}

export default OpenIdLogin
