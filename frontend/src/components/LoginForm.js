import React from 'react'
import { view } from 'react-easy-state'
import { Button, Form, FormFeedback, FormGroup, Input } from 'reactstrap'
import { auth } from '../store'

class LoginForm extends React.Component {
  constructor() {
    super()

    this.state = {
      username: '',
      password: '',
      error: null,
    }

    this.handleLogin = this.handleLogin.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.validateForm = this.validateForm.bind(this)
  }

  validateForm() {
    return this.state.username.length > 0 && this.state.password.length > 0
  }

  handleLogin(event) {
    const { username, password } = this.state
    event.preventDefault()
    auth.login(username, password).then(resp => {
      if (resp.error !== null) this.setState({ error: resp.description })
    })
  }

  handleChange(event) {
    this.setState({ [event.target.id]: event.target.value })
  }

  render() {
    return (
      <Form className="px-4 py-3" onSubmit={this.handleLogin}>
        <FormGroup>
          <Input
            name="username"
            id="username"
            placeholder="Username"
            value={this.state.username}
            onChange={this.handleChange}
            invalid={this.state.error !== null}
            required
            autoComplete="username"
          />
        </FormGroup>
        <FormGroup>
          <Input
            type="password"
            name="password"
            id="password"
            placeholder="Password"
            value={this.state.password}
            onChange={this.handleChange}
            invalid={this.state.error !== null}
            required
            autoComplete="current-password"
          />
          <FormFeedback>{this.state.error}</FormFeedback>
        </FormGroup>
        <Button color="success" block disabled={!this.validateForm()}>
          Login
        </Button>
      </Form>
    )
  }
}

export default view(LoginForm)
