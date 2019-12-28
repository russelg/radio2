import React from 'react'
import { view } from 'react-easy-state'
import { Button, Form, FormFeedback, FormGroup, Input } from 'reactstrap'
import { auth } from '/store'
import { Description } from '/api/Schemas'
import { css, cx } from 'emotion'

const formControlStyle = css`
  .form-control {
    position: relative;
    box-sizing: border-box;
    height: auto;
    padding: 10px;
    font-size: 16px;
  }

  .form-control:focus {
    z-index: 2;
  }
`

export interface Props {}

export interface State {
  username: string
  password: string
  error?: Description | null
}

class LoginForm extends React.Component<Props, State> {
  state = {
    username: '',
    password: '',
    error: null
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
      if (resp.error !== null) this.setState({ error: resp.description })
    })
  }

  handleChange(event: React.FormEvent<EventTarget>) {
    const target = event.target as HTMLInputElement
    const newState = this.state
    newState[target.name as 'username' | 'password'] = target.value
    this.setState({ ...newState })
  }

  render() {
    return (
      <Form
        className={cx(formControlStyle, 'px-4 py-3')}
        onSubmit={this.handleLogin}>
        <FormGroup>
          <Input
            name="username"
            placeholder="Username"
            value={this.state.username}
            onChange={this.handleChange}
            invalid={this.state.error !== null}
            required
            autoComplete="username"
            className={css`
              margin-bottom: -1px;
              border-bottom-left-radius: 0 !important;
              border-bottom-right-radius: 0 !important;
            `}
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
            className={css`
              margin-bottom: 10px;
              border-top-left-radius: 0 !important;
              border-top-right-radius: 0 !important;
            `}
          />
          <FormFeedback>
            {this.state.error !== null
              ? (this.state.error! as Description).toString()
              : ''}
          </FormFeedback>
        </FormGroup>
        <Button color="success" block disabled={!this.validateForm()}>
          Login
        </Button>
      </Form>
    )
  }
}

export default view(LoginForm)
