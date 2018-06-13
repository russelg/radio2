import React from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Form,
  FormGroup,
  Input,
  UncontrolledDropdown
} from 'reactstrap'
import { auth } from '../store'
import { view } from 'react-easy-state'

class LoginDropdown extends React.Component {
  constructor() {
    super()

    this.state = {
      username: 'username',
      password: 'password'
    }

    this.handleLogin = this.handleLogin.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.validateForm = this.validateForm.bind(this)
  }

  validateForm() {
    return this.state.username.length > 0 && this.state.password.length > 0
  }

  async handleLogin(event) {
    const {username, password} = this.state
    event.preventDefault()
    console.log(this.state)
    await auth.login(username, password)
  }

  handleChange(event) {
    this.setState({[event.target.id]: event.target.value})
  }

  render() {
    return (
      <UncontrolledDropdown nav inNavbar>
        <DropdownToggle nav caret>
          Sign in
        </DropdownToggle>
        <DropdownMenu right>
          <Form className="px-4 py-3" onSubmit={this.handleLogin}>
            <FormGroup>
              <Input name="username" id="username" placeholder="Username" value={this.state.username}
                     onChange={this.handleChange} required />
            </FormGroup>
            <FormGroup>
              <Input type="password" name="password" id="password" placeholder="Password" value={this.state.password}
                     onChange={this.handleChange} required />
            </FormGroup>
            <Button color="success" block disabled={!this.validateForm()}>Login</Button>
          </Form>
          <DropdownItem to="/sign-up" tag={Link}>New around here? Sign up</DropdownItem>
        </DropdownMenu>
      </UncontrolledDropdown>
    )
  }
}

export default view(LoginDropdown)