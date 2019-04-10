import React from 'react'
import { view } from 'react-easy-state'
import { Link } from 'react-router-dom'
import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from 'reactstrap'
import LoginForm from './LoginForm'

class LoginDropdown extends React.PureComponent {
  render() {
    return (
      <UncontrolledDropdown nav inNavbar>
        <DropdownToggle nav caret>
          Sign in
        </DropdownToggle>
        <DropdownMenu right>
          <LoginForm />
          <DropdownItem to="/sign-up" tag={Link}>
            New around here? Sign up
          </DropdownItem>
        </DropdownMenu>
      </UncontrolledDropdown>
    )
  }
}

export default view(LoginDropdown)
