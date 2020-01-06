import React, { FunctionComponent } from 'react'
import { view } from 'react-easy-state'
import { Redirect } from 'react-router-dom'
import { useAuthContext } from '/authContext'
import Dialog from '/components/Dialog'
import LoginForm from '/components/LoginForm'

const SignIn: FunctionComponent = () => {
  const { loggedIn } = useAuthContext()
  if (loggedIn) return <Redirect to="/" />

  return (
    <Dialog title="Sign In">
      <LoginForm />
    </Dialog>
  )
}

export default view(SignIn)
