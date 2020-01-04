import React from 'react'
import { view } from 'react-easy-state'
import { Redirect } from 'react-router-dom'
import Dialog from '/components/Dialog'
import LoginForm from '/components/LoginForm'
import { auth } from '/store'

class SignIn extends React.Component {
  render() {
    if (auth.logged_in) return <Redirect to="/" />

    return (
      <Dialog title="Sign In">
        <LoginForm />
      </Dialog>
    )
  }
}

export default view(SignIn)
