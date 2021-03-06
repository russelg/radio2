import Dialog from '/components/Dialog'
import LoginForm from '/components/LoginForm'
import { useAuthState } from '/contexts/auth'
import React, { FunctionComponent } from 'react'
import { Redirect } from 'react-router-dom'

const SignIn: FunctionComponent = () => {
  const { loggedIn } = useAuthState()
  if (loggedIn) return <Redirect to="/" />

  return (
    <Dialog title="Sign In">
      <LoginForm />
    </Dialog>
  )
}

export default SignIn
