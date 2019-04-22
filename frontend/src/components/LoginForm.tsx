import React from 'react'
import { view } from 'react-easy-state'
import { Button, Form, FormFeedback, FormGroup, Input } from 'reactstrap'
import { auth } from '../store'
import './LoginForm.css'

export interface Props {}

export interface State {
  username: string
  password: string
  error?: string
}

class LoginForm extends React.Component<Props, State> {
  state = {
    username: '',
    password: '',
    error: undefined,
  }

  constructor(props: Props) {
    super(props)

    this.handleLogin = this.handleLogin.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.validateForm = this.validateForm.bind(this)
  }

  validateForm() {
    return this.state.username.length > 0 && this.state.password.length > 0
  }

  handleLogin(event: React.FormEvent<EventTarget>) {
    const { username, password } = this.state
    event.preventDefault()
    auth.login(username, password).then(resp => {
      if (resp.error !== undefined) this.setState({ error: resp.description })
    })
  }

  handleChange(event: React.FormEvent<EventTarget>) {
    let target = event.target as HTMLInputElement
    let newState = {}
    newState[target.name] = target.value
    this.setState({ ...newState })
  }

  render() {
    return (
      <Form className="px-4 py-3 form-signin" onSubmit={this.handleLogin}>
        <FormGroup>
          <Input
            name="username"
            placeholder="Username"
            value={this.state.username}
            onChange={this.handleChange}
            invalid={this.state.error !== null}
            required
            autoComplete="username"
            className="username"
          />
          <Input
            type="password"
            name="password"
            placeholder="Password"
            value={this.state.password}
            onChange={this.handleChange}
            invalid={this.state.error !== null}
            required
            autoComplete="current-password"
            className="password"
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
