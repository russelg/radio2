import React, { FunctionComponent } from 'react'
import { view } from 'react-easy-state'
import { Redirect } from 'react-router-dom'
import Dialog from '/components/Dialog'
import LoginForm from '/components/LoginForm'
import { auth } from '/store'

const SignIn: FunctionComponent = () => {
  if (auth.logged_in) return <Redirect to="/" />

  return (
    <Dialog title="Sign In">
      <LoginForm />
    </Dialog>
  )
}

export default view(SignIn)
